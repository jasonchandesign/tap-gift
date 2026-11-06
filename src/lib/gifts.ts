import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";

export { formatDollars } from "./gifts-format";

export const RulesSchema = z.object({
  likes: z.array(z.string()),
  avoid: z.array(z.string()),
  size: z.string().optional(),
});

export type Rules = z.infer<typeof RulesSchema>;

export const ShippingSchema = z.object({
  name: z.string().trim().min(1).max(100),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().length(2),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
});

export type Shipping = z.infer<typeof ShippingSchema>;

/** Used until the gifter says otherwise. */
export const DEFAULT_BUDGET_CENTS = 20_000;

export type GiftStatus = "draft" | "saved" | "picked" | "charged";

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
  shipping_json: Shipping | null;
  turns_used: number;
  status: GiftStatus;
};

export type NewGift = {
  giverName: string;
  recipientName: string;
  recipientAge: number;
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

export async function createGift(gift: NewGift) {
  const id = randomUUID();
  const { query } = await db();
  await query(
    `INSERT INTO gifts (id, token, giver_name, recipient_name, recipient_age, budget_cents,
       note, rules_json)
     VALUES ($1, $2, $3, $4, $5, $6, '', $7)`,
    [
      id,
      randomBytes(16).toString("hex"),
      gift.giverName,
      gift.recipientName,
      gift.recipientAge,
      DEFAULT_BUDGET_CENTS,
      JSON.stringify(gift.rules),
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

export async function saveRules(id: string, budgetCents: number, rules: Rules) {
  const { query } = await db();
  await query(
    "UPDATE gifts SET budget_cents = $2, rules_json = $3 WHERE id = $1 AND status = 'draft'",
    [id, budgetCents, JSON.stringify(rules)],
  );
}

export async function saveDelivery(id: string, note: string, shipping: Shipping) {
  const { query } = await db();
  await query("UPDATE gifts SET note = $2, shipping_json = $3 WHERE id = $1 AND status = 'draft'", [
    id,
    note,
    JSON.stringify(shipping),
  ]);
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

/** A card has no active gift until it's linked to one that's saved. A used gift stays viewable. */
export async function lookupCard(cardId: string): Promise<CardLookup> {
  const { query } = await db();
  const { rows } = await query<{ token: string; status: GiftStatus }>(
    `SELECT g.token, g.status FROM cards c JOIN gifts g ON g.id = c.current_gift_id WHERE c.id = $1`,
    [cardId],
  );
  const gift = rows[0];
  if (!gift || gift.status === "draft") return { state: "empty" };
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
