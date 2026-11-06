import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";

export const RulesSchema = z.object({
  likes: z.array(z.string()),
  avoid: z.array(z.string()),
  intent: z.string(),
});

export type Rules = z.infer<typeof RulesSchema>;

export type GiftStatus = "draft" | "saved" | "picked" | "approved" | "charged";

export type Gift = {
  id: string;
  token: string;
  giver_name: string;
  recipient_name: string;
  recipient_age: number;
  budget_cents: number;
  note: string;
  rules_json: Rules;
  setup_token_id: string | null;
  vault_id: string | null;
  parent_contact: string;
  status: GiftStatus;
};

export type NewGift = {
  giverName: string;
  recipientName: string;
  recipientAge: number;
  budgetCents: number;
  note: string;
  parentContact: string;
  rules: Rules;
};

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function giftUrl(token: string) {
  return `${appUrl()}/g/${token}`;
}

export function cardUrl(cardId: string) {
  return `${appUrl()}/c/${cardId}`;
}

export function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export async function createGift(gift: NewGift) {
  const id = randomUUID();
  const { query } = await db();
  await query(
    `INSERT INTO gifts (id, token, giver_name, recipient_name, recipient_age, budget_cents,
       note, rules_json, parent_contact, approve_secret)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      randomBytes(16).toString("hex"),
      gift.giverName,
      gift.recipientName,
      gift.recipientAge,
      gift.budgetCents,
      gift.note,
      JSON.stringify(gift.rules),
      gift.parentContact,
      randomBytes(16).toString("hex"),
    ],
  );
  return id;
}

export async function getGift(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { query } = await db();
  const { rows } = await query<Gift>("SELECT * FROM gifts WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getGiftByToken(token: string) {
  const { query } = await db();
  const { rows } = await query<Gift>("SELECT * FROM gifts WHERE token = $1", [token]);
  return rows[0] ?? null;
}

export async function confirmRules(
  id: string,
  update: { budgetCents: number; recipientAge: number; rules: Rules },
) {
  const { query } = await db();
  await query(
    "UPDATE gifts SET budget_cents = $2, recipient_age = $3, rules_json = $4 WHERE id = $1 AND status = 'draft'",
    [id, update.budgetCents, update.recipientAge, JSON.stringify(update.rules)],
  );
}

export async function setSetupToken(id: string, setupTokenId: string) {
  const { query } = await db();
  await query("UPDATE gifts SET setup_token_id = $2 WHERE id = $1", [id, setupTokenId]);
}

export async function markSaved(id: string, vaultId: string, customerId: string | null) {
  const { query } = await db();
  await query(
    `UPDATE gifts SET vault_id = $2, paypal_customer_id = $3, status = 'saved'
     WHERE id = $1 AND status = 'draft'`,
    [id, vaultId, customerId],
  );
}

export type CardLookup =
  | { state: "ready"; token: string }
  | { state: "empty" };

/** A card has no active gift until it's linked to one that's saved and not yet charged. */
export async function lookupCard(cardId: string): Promise<CardLookup> {
  const { query } = await db();
  const { rows } = await query<{ token: string; status: GiftStatus }>(
    `SELECT g.token, g.status FROM cards c JOIN gifts g ON g.id = c.current_gift_id WHERE c.id = $1`,
    [cardId],
  );
  const gift = rows[0];
  if (!gift || gift.status === "draft" || gift.status === "charged") return { state: "empty" };
  return { state: "ready", token: gift.token };
}

export async function createCard(giftId: string) {
  const id = randomBytes(12).toString("base64url");
  const { query } = await db();
  await query("INSERT INTO cards (id, current_gift_id) VALUES ($1, $2)", [id, giftId]);
  await query("UPDATE gifts SET delivery = 'card' WHERE id = $1", [giftId]);
  return id;
}

/** Points an existing card at a new gift, unless the card still holds a gift in progress. */
export async function relinkCard(cardId: string, giftId: string) {
  const { query } = await db();
  const { rows } = await query<{ id: string }>(
    `UPDATE cards c SET current_gift_id = $2
     WHERE c.id = $1 AND (
       c.current_gift_id IS NULL
       OR c.current_gift_id = $2
       OR EXISTS (SELECT 1 FROM gifts g WHERE g.id = c.current_gift_id AND g.status = 'charged')
     )
     RETURNING c.id`,
    [cardId, giftId],
  );
  if (rows.length === 0) return false;
  await query("UPDATE gifts SET delivery = 'card' WHERE id = $1", [giftId]);
  return true;
}
