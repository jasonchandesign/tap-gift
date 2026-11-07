import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import type { AudienceId, SkinId } from "./skins";

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

export type GiftStatus = "draft" | "paid" | "chosen" | "canceled";

export type Gift = {
  id: string;
  token: string;
  giver_name: string;
  recipient_name: string;
  /** Only for the shipping label. The gift tag uses the first name. */
  recipient_last_name: string;
  recipient_age: number;
  budget_cents: number;
  note: string;
  rules_json: Rules;
  shipping_json: Shipping | null;
  card_id: string | null;
  delivery: "card" | "link";
  skin: string;
  audience: string;
  paypal_order_id: string | null;
  capture_id: string | null;
  paid_cents: number | null;
  refund_cents: number;
  refund_id: string | null;
  turns_used: number;
  status: GiftStatus;
};

export type NewGift = {
  recipientName: string;
  recipientLastName: string;
  recipientAge: number;
  rules: Rules;
  skin: SkinId;
  audience: AudienceId;
  cardId?: string;
};

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function giftUrl(token: string) {
  return `${appUrl()}/g/${token}`;
}

export async function createGift(gift: NewGift) {
  const id = randomUUID();
  const { query } = await db();
  await query(
    `INSERT INTO gifts (id, token, giver_name, recipient_name, recipient_age, budget_cents,
       note, rules_json, card_id, skin, audience, recipient_last_name)
     VALUES ($1, $2, '', $3, $4, $5, '', $6, $7, $8, $9, $10)`,
    [
      id,
      randomBytes(16).toString("hex"),
      gift.recipientName,
      gift.recipientAge,
      DEFAULT_BUDGET_CENTS,
      JSON.stringify(gift.rules),
      gift.cardId ?? null,
      gift.skin,
      gift.audience,
      gift.recipientLastName,
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

export async function saveDelivery(
  id: string,
  giverName: string,
  note: string,
  shipping: Shipping,
) {
  const { query } = await db();
  await query(
    `UPDATE gifts SET giver_name = $2, note = $3, shipping_json = $4
     WHERE id = $1 AND status = 'draft'`,
    [id, giverName, note, JSON.stringify(shipping)],
  );
}

export async function setPayPalOrder(id: string, orderId: string) {
  const { query } = await db();
  await query("UPDATE gifts SET paypal_order_id = $2 WHERE id = $1", [id, orderId]);
}

export async function markPaid(id: string, captureId: string, paidCents: number) {
  const { query } = await db();
  await query(
    `UPDATE gifts SET capture_id = $2, paid_cents = $3, status = 'paid'
     WHERE id = $1 AND status = 'draft'`,
    [id, captureId, paidCents],
  );
}

export type CardLookup =
  | { state: "gift"; token: string }
  | { state: "blank" }
  | { state: "unknown" };

/** Card links are random, so any well-formed ID is a card that may not be in the database yet. */
function isCardId(cardId: string) {
  return /^[\w-]{16}$/.test(cardId);
}

async function cardGift(cardId: string) {
  const { query } = await db();
  const { rows } = await query<{ token: string; status: GiftStatus }>(
    `SELECT g.token, g.status FROM cards c JOIN gifts g ON g.id = c.current_gift_id WHERE c.id = $1`,
    [cardId],
  );
  return rows[0] ?? null;
}

/** A tap opens a paid or chosen gift. Otherwise the card is ready to start a new one. */
export async function lookupCard(cardId: string): Promise<CardLookup> {
  if (!isCardId(cardId)) return { state: "unknown" };
  const gift = await cardGift(cardId);
  if (gift?.status === "paid" || gift?.status === "chosen") {
    return { state: "gift", token: gift.token };
  }
  return { state: "blank" };
}

/** A card can take a new gift unless it holds one that's still waiting to be chosen. */
export async function cardIsFree(cardId: string) {
  if (!isCardId(cardId)) return false;
  return (await cardGift(cardId))?.status !== "paid";
}

/** Puts a paid gift on its card. If someone else filled the card first, the gift stays a link. */
export async function attachCard(cardId: string, giftId: string) {
  const { query } = await db();
  const { rows } = await query<{ id: string }>(
    `INSERT INTO cards (id, current_gift_id) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET current_gift_id = $2
     WHERE cards.current_gift_id IS NULL
       OR cards.current_gift_id = $2
       OR EXISTS (
         SELECT 1 FROM gifts g WHERE g.id = cards.current_gift_id AND g.status <> 'paid'
       )
     RETURNING id`,
    [cardId, giftId],
  );
  if (rows.length === 0) return false;
  await query("UPDATE gifts SET delivery = 'card' WHERE id = $1", [giftId]);
  return true;
}

/** The gifter went back to change who it's for. The chat and cart stay. */
export async function updateGiftDetails(id: string, details: Omit<NewGift, "rules" | "cardId">) {
  const { query } = await db();
  const { rows } = await query(
    `UPDATE gifts SET recipient_name = $2, recipient_age = $3, skin = $4, audience = $5,
       recipient_last_name = $6
     WHERE id = $1 AND status = 'draft' RETURNING id`,
    [
      id,
      details.recipientName,
      details.recipientAge,
      details.skin,
      details.audience,
      details.recipientLastName,
    ],
  );
  return rows.length > 0;
}
