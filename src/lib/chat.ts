import { db } from "./db";
import { isSizeGroup } from "./gifts-format";
import type { CheckedProduct, VariantGroup } from "./rules";

export const MAX_TURNS = 12;
export const MAX_PICKS = 5;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type VariantChoice = Record<string, string>;

export type ShownOption = {
  id: string;
  title: string;
  price_cents: number;
  image_url: string;
  merchant: string;
  reason: string;
  variants_json: VariantGroup[];
  variant_choice_json: VariantChoice;
};

const OPTION_FIELDS =
  "id, title, price_cents, image_url, merchant, reason, variants_json, variant_choice_json";

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
    "SELECT role, content FROM messages WHERE gift_id = $1 ORDER BY id",
    [giftId],
  );
  return rows;
}

export async function saveExchange(giftId: string, userText: string, assistantText: string) {
  const { query } = await db();
  await query(
    `INSERT INTO messages (gift_id, role, content)
     VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
    [giftId, userText, assistantText],
  );
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
      `INSERT INTO options (gift_id, turn, channel3_id, title, price_cents, image_url,
         merchant, merchant_url, reason, rule_check_json, variants_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        giftId,
        turn,
        product.id,
        product.title,
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

/**
 * Saves what the gifter is sending, with the size of anything that has sizes.
 * The kid chooses any color or version later.
 * The budget becomes the priciest pick, because that's the most the kid's choice can charge.
 */
export async function savePicks(
  giftId: string,
  picks: { optionId: string; choice: VariantChoice }[],
) {
  const { query } = await db();
  const optionIds = picks.map((pick) => pick.optionId);
  const { rows } = await query<ShownOption>(
    `SELECT ${OPTION_FIELDS} FROM options WHERE gift_id = $1 AND id = ANY($2::bigint[])`,
    [giftId, optionIds],
  );
  if (rows.length !== new Set(optionIds).size) return false;

  await query("UPDATE options SET selected = false WHERE gift_id = $1", [giftId]);
  for (const option of rows) {
    const choice = picks.find(({ optionId }) => optionId === String(option.id))?.choice ?? {};
    const sizes = option.variants_json.filter(isSizeGroup);
    if (!sizes.every((group) => group.values.includes(choice[group.name] ?? ""))) return false;

    await query("UPDATE options SET selected = true, variant_choice_json = $2 WHERE id = $1", [
      option.id,
      JSON.stringify(Object.fromEntries(sizes.map(({ name }) => [name, choice[name]]))),
    ]);
  }
  await query("UPDATE gifts SET budget_cents = $2 WHERE id = $1 AND status = 'draft'", [
    giftId,
    Math.max(...rows.map((option) => option.price_cents)),
  ]);
  return true;
}
