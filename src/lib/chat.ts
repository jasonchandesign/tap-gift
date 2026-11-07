import { db } from "./db";
import { isSizeGroup } from "./gifts-format";
import type { CheckedProduct, VariantGroup } from "./rules";
import type { Motif } from "./wraps";

export const MAX_TURNS = 12;
export const MAX_PICKS = 5;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  turn: number;
  suggestions_json: string[];
};

export type VariantChoice = Record<string, string>;

export type ShownOption = {
  id: string;
  channel3_id: string;
  turn: number;
  title: string;
  description: string;
  price_cents: number;
  image_url: string;
  merchant: string;
  reason: string;
  variants_json: VariantGroup[];
  variant_choice_json: VariantChoice;
  wrap_json: Motif[] | null;
};

const OPTION_FIELDS =
  "id, channel3_id, turn, title, description, price_cents, image_url, merchant, reason, variants_json, variant_choice_json, wrap_json";

/** Claims one turn atomically. Returns the new count, or null if the gift can't shop. */
export async function takeTurn(giftId: string) {
  const { query } = await db();
  const { rows } = await query<{ turns_used: number }>(
    `UPDATE gifts SET turns_used = turns_used + 1
     WHERE id = $1 AND status = 'draft' AND turns_used < $2
     RETURNING turns_used`,
    [giftId, MAX_TURNS],
  );
  return rows[0]?.turns_used ?? null;
}

export async function refundTurn(giftId: string) {
  const { query } = await db();
  await query("UPDATE gifts SET turns_used = turns_used - 1 WHERE id = $1 AND turns_used > 0", [
    giftId,
  ]);
}

export async function listMessages(giftId: string) {
  const { query } = await db();
  const { rows } = await query<ChatMessage>(
    "SELECT role, content, turn, suggestions_json FROM messages WHERE gift_id = $1 ORDER BY id",
    [giftId],
  );
  return rows;
}

export async function saveExchange(
  giftId: string,
  turn: number,
  userText: string,
  assistantText: string,
  suggestions: string[],
) {
  const { query } = await db();
  await query(
    `INSERT INTO messages (gift_id, turn, role, content, suggestions_json)
     VALUES ($1, $2, 'user', $3, '[]'), ($1, $2, 'assistant', $4, $5)`,
    [giftId, turn, userText, assistantText, JSON.stringify(suggestions)],
  );
}

/** Every gift shown so far, so the gifter can scroll back through the conversation. */
export async function allOptions(giftId: string) {
  const { query } = await db();
  const { rows } = await query<ShownOption>(
    `SELECT ${OPTION_FIELDS} FROM options WHERE gift_id = $1 ORDER BY id`,
    [giftId],
  );
  return rows;
}

export async function latestOptions(giftId: string) {
  const { query } = await db();
  const { rows } = await query<ShownOption>(
    `SELECT ${OPTION_FIELDS} FROM options
     WHERE gift_id = $1
       AND turn = (SELECT max(turn) FROM options WHERE gift_id = $1)
     ORDER BY id`,
    [giftId],
  );
  return rows;
}

export async function selectedOptions(giftId: string) {
  const { query } = await db();
  const { rows } = await query<ShownOption>(
    `SELECT ${OPTION_FIELDS} FROM options WHERE gift_id = $1 AND selected ORDER BY id`,
    [giftId],
  );
  return rows;
}

export async function saveOptions(
  giftId: string,
  turn: number,
  picks: { product: CheckedProduct; reason: string }[],
) {
  const { query } = await db();
  for (const { product, reason } of picks) {
    await query(
      `INSERT INTO options (gift_id, turn, channel3_id, title, description, price_cents, image_url,
         merchant, merchant_url, reason, rule_check_json, variants_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        giftId,
        turn,
        product.id,
        product.title,
        product.description,
        product.priceCents,
        product.imageUrl,
        product.merchant,
        product.merchantUrl,
        reason,
        JSON.stringify(product.check),
        JSON.stringify(product.variants),
      ],
    );
  }
}

export type PickResult = "saved" | "full" | "size" | "missing";

/**
 * Puts a gift in the cart, with its size if it has sizes. The kid chooses any color or version
 * later. An open PayPal order was for the old cart, so it can't be used any more.
 */
export async function addPick(
  giftId: string,
  optionId: string,
  choice: VariantChoice,
): Promise<PickResult> {
  const { query } = await db();
  const { rows } = await query<ShownOption>(
    `SELECT ${OPTION_FIELDS} FROM options WHERE gift_id = $1 AND id = $2`,
    [giftId, optionId],
  );
  const option = rows[0];
  if (!option) return "missing";

  const sizes = option.variants_json.filter(isSizeGroup);
  if (!sizes.every((group) => group.values.includes(choice[group.name] ?? ""))) return "size";

  // The limit is checked in the same statement, so two quick taps can't pass it together.
  const saved = await query<{ id: string }>(
    `UPDATE options SET selected = true, variant_choice_json = $3
     WHERE id = $2 AND (
       SELECT count(*) FROM options WHERE gift_id = $1 AND selected AND id <> $2
     ) < $4
     RETURNING id`,
    [
      giftId,
      optionId,
      JSON.stringify(Object.fromEntries(sizes.map(({ name }) => [name, choice[name]]))),
      MAX_PICKS,
    ],
  );
  if (!saved.rows.length) return "full";
  await query("UPDATE gifts SET paypal_order_id = NULL WHERE id = $1", [giftId]);
  return "saved";
}

export async function removePick(giftId: string, optionId: string) {
  const { query } = await db();
  await query("UPDATE options SET selected = false WHERE gift_id = $1 AND id = $2", [
    giftId,
    optionId,
  ]);
  await query("UPDATE gifts SET paypal_order_id = NULL WHERE id = $1", [giftId]);
}
