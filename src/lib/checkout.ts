import { ApiError } from "@paypal/paypal-server-sdk";
import { randomUUID } from "node:crypto";
import { getProduct } from "./channel3";
import type { VariantChoice } from "./chat";
import { db } from "./db";
import type { Gift } from "./gifts";
import { chargeSavedAccount } from "./paypal";
import { checkProduct, type VariantGroup } from "./rules";

type ChosenOption = {
  id: string;
  channel3_id: string;
  title: string;
  price_cents: number;
  variants_json: VariantGroup[];
  variant_choice_json: VariantChoice;
};

export type ChosenGift = {
  title: string;
  image_url: string;
  price_cents: number;
  variant_choice_json: VariantChoice;
  thank_you_note: string | null;
};

export type ChooseResult = "charged" | "taken" | "unavailable" | "variant" | "failed";

/** A store can sell out after the gifter chose. If the lookup itself fails, we go ahead. */
async function isStillAvailable(gift: Gift, option: ChosenOption) {
  try {
    const product = await getProduct(option.channel3_id);
    return !!product && !!checkProduct(product, option.price_cents, gift.rules_json.avoid);
  } catch (error) {
    console.error("Availability check failed", error);
    return true;
  }
}

/** Fulfillment is simulated: this records the order and charges PayPal, but buys nothing. */
export async function chooseGift(
  gift: Gift,
  optionId: string,
  kidChoice: VariantChoice,
): Promise<ChooseResult> {
  const { query } = await db();
  const { rows } = await query<ChosenOption>(
    `SELECT id, channel3_id, title, price_cents, variants_json, variant_choice_json FROM options
     WHERE gift_id = $1 AND id = $2 AND selected`,
    [gift.id, optionId],
  );
  const option = rows[0];
  if (!option || !gift.vault_id || !gift.shipping_json) return "failed";

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

  // Only one request can move the gift out of 'saved', so a double tap can't charge twice.
  const claimed = await query<{ id: string }>(
    "UPDATE gifts SET status = 'picked' WHERE id = $1 AND status = 'saved' RETURNING id",
    [gift.id],
  );
  if (!claimed.rows.length) return "taken";

  await query("UPDATE options SET variant_choice_json = $2 WHERE id = $1", [
    option.id,
    JSON.stringify(choice),
  ]);

  const orderId = randomUUID();
  await query(
    `INSERT INTO orders (id, gift_id, option_id, amount_cents, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [orderId, gift.id, option.id, option.price_cents],
  );

  try {
    const { paypalOrderId, captureId } = await chargeSavedAccount({
      orderId,
      vaultId: gift.vault_id,
      amountCents: option.price_cents,
      description: option.title,
      shipping: gift.shipping_json,
    });
    await query(
      "UPDATE orders SET status = 'completed', paypal_order_id = $2, capture_id = $3 WHERE id = $1",
      [orderId, paypalOrderId, captureId],
    );
    await query("UPDATE gifts SET status = 'charged' WHERE id = $1", [gift.id]);
    return "charged";
  } catch (error) {
    const detail = error instanceof ApiError ? `${error.statusCode} ${String(error.body)}` : error;
    console.error("PayPal charge failed", detail);
    await query("UPDATE orders SET status = 'failed' WHERE id = $1", [orderId]);
    await query("UPDATE gifts SET status = 'saved' WHERE id = $1", [gift.id]);
    return "failed";
  }
}

export async function chosenGift(giftId: string) {
  const { query } = await db();
  const { rows } = await query<ChosenGift>(
    `SELECT o.title, o.image_url, o.price_cents, o.variant_choice_json, r.thank_you_note
     FROM orders r JOIN options o ON o.id = r.option_id
     WHERE r.gift_id = $1 AND r.status = 'completed'`,
    [giftId],
  );
  return rows[0] ?? null;
}

export async function saveThankYou(giftId: string, note: string) {
  const { query } = await db();
  await query("UPDATE orders SET thank_you_note = $2 WHERE gift_id = $1 AND status = 'completed'", [
    giftId,
    note,
  ]);
}
