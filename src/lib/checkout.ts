import { ApiError } from "@paypal/paypal-server-sdk";
import { randomUUID } from "node:crypto";
import { getProduct } from "./channel3";
import type { VariantChoice } from "./chat";
import { priceOnly, type Cost } from "./costs";
import { db } from "./db";
import { getGift, type Gift } from "./gifts";
import { refundPayment } from "./paypal";
import { checkProduct, type VariantGroup } from "./rules";

type ChosenOption = {
  id: string;
  channel3_id: string;
  title: string;
  price_cents: number;
  variants_json: VariantGroup[];
  variant_choice_json: VariantChoice;
  cost_json: Cost | null;
};

export type ChosenGift = {
  title: string;
  image_url: string;
  price_cents: number;
  merchant: string | null;
  variant_choice_json: VariantChoice;
  thank_you_note: string | null;
  /** What sending it costs: price, shipping and tax. */
  cost: Cost;
};

/** Keeps each pick's estimated cost, worked out when the gifter pays. */
export async function saveCosts(picks: { id: string; cost: Cost }[]) {
  const { query } = await db();
  for (const pick of picks) {
    await query("UPDATE options SET cost_json = $2 WHERE id = $1", [pick.id, JSON.stringify(pick.cost)]);
  }
}

export type ChooseResult = "chosen" | "taken" | "unavailable" | "variant" | "failed";

/** A store can sell out after the gifter chose. If the lookup itself fails, we go ahead. */
async function isStillAvailable(gift: Gift, option: ChosenOption) {
  try {
    const product = await getProduct(option.channel3_id);
    return !!product && !!checkProduct(product, option.price_cents, gift.rules_json.avoid, gift.recipient_age);
  } catch (error) {
    console.error("Availability check failed", error);
    return true;
  }
}

/**
 * Fulfillment is simulated: this records the order, but buys nothing. The gifter has already
 * paid, so nothing about their PayPal account can stop the kid here.
 */
export async function chooseGift(
  gift: Gift,
  optionId: string,
  kidChoice: VariantChoice,
): Promise<ChooseResult> {
  const { query } = await db();
  const { rows } = await query<ChosenOption>(
    `SELECT id, channel3_id, title, price_cents, variants_json, variant_choice_json, cost_json FROM options
     WHERE gift_id = $1 AND id = $2 AND selected`,
    [gift.id, optionId],
  );
  const option = rows[0];
  if (!option) return "failed";

  // The gifter's size comes last, so nothing from the kid's page can change it.
  const choice = { ...kidChoice, ...option.variant_choice_json };
  const validChoice = option.variants_json.every((group) =>
    group.values.includes(choice[group.name] ?? ""),
  );
  if (!validChoice) return "variant";

  if (!(await isStillAvailable(gift, option))) {
    await query("UPDATE options SET selected = false WHERE id = $1", [option.id]);
    return "unavailable";
  }

  // The gift's price plus its shipping and tax come out of what the gifter paid; the rest goes back.
  const spent = (option.cost_json ?? priceOnly(option.price_cents)).total_cents;

  // One statement, so only one request can claim the gift, and a claim always has its order.
  const claimed = await query<{ id: string }>(
    `WITH claimed AS (
       UPDATE gifts SET status = 'chosen', refund_cents = GREATEST(paid_cents - $3::integer, 0)
       WHERE id = $1 AND status = 'paid' RETURNING id
     ), choice AS (
       UPDATE options SET variant_choice_json = $4::jsonb, image_url = COALESCE($6, image_url)
       WHERE id = $2::bigint AND EXISTS (SELECT 1 FROM claimed)
     )
     INSERT INTO orders (id, gift_id, option_id, amount_cents, status)
     SELECT $5::uuid, id, $2::bigint, $3::integer, 'completed' FROM claimed
     RETURNING id`,
    [
      gift.id,
      option.id,
      spent,
      JSON.stringify(choice),
      randomUUID(),
      // The photo of the color they chose, so the thank-you screen shows that one.
      option.variants_json.map((group) => group.images?.[choice[group.name]]).find(Boolean) ?? null,
    ],
  );
  return claimed.rows.length ? "chosen" : "taken";
}

/** Only a gift nobody has chosen can be canceled, so this and chooseGift can't both win. */
export async function cancelGift(giftId: string) {
  const { query } = await db();
  const { rows } = await query<{ id: string }>(
    `UPDATE gifts SET status = 'canceled', refund_cents = paid_cents
     WHERE id = $1 AND status = 'paid' RETURNING id`,
    [giftId],
  );
  return rows.length > 0;
}

/**
 * Sends the gifter anything they're owed, and reports whether that's done. A failed refund stays
 * owed, so calling this again retries it.
 */
export async function settleRefund(giftId: string) {
  const gift = await getGift(giftId);
  if (!gift?.capture_id || gift.refund_cents === 0 || gift.refund_id) return true;

  try {
    const refundId = await refundPayment({
      captureId: gift.capture_id,
      amountCents: gift.refund_cents,
      requestId: `refund-${gift.id}`,
    });
    const { query } = await db();
    await query("UPDATE gifts SET refund_id = $2 WHERE id = $1", [gift.id, refundId]);
    return true;
  } catch (error) {
    const detail = error instanceof ApiError ? `${error.statusCode} ${String(error.body)}` : error;
    console.error("PayPal refund failed", detail);
    return false;
  }
}

export async function chosenGift(giftId: string): Promise<ChosenGift | null> {
  const { query } = await db();
  const { rows } = await query<Omit<ChosenGift, "cost"> & { cost_json: Cost | null }>(
    `SELECT o.title, o.image_url, o.price_cents, o.merchant, o.variant_choice_json, o.cost_json,
       r.thank_you_note
     FROM orders r JOIN options o ON o.id = r.option_id
     WHERE r.gift_id = $1 AND r.status = 'completed'`,
    [giftId],
  );
  const row = rows[0];
  if (!row) return null;
  const { cost_json, ...chosen } = row;
  return { ...chosen, cost: cost_json ?? priceOnly(row.price_cents) };
}

export async function saveThankYou(giftId: string, note: string) {
  const { query } = await db();
  await query("UPDATE orders SET thank_you_note = $2 WHERE gift_id = $1 AND status = 'completed'", [
    giftId,
    note,
  ]);
}
