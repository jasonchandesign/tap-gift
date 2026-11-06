import { appUrl, attachCard, getGift, markPaid } from "@/lib/gifts";
import { capturePayment } from "@/lib/paypal";

/** PayPal sends the buyer here after approval. This takes the payment. */
export async function GET(request: Request) {
  const giftId = new URL(request.url).searchParams.get("gift") ?? "";
  const gift = await getGift(giftId);
  if (!gift) return Response.redirect(`${appUrl()}/`, 303);

  if (gift.status !== "draft") {
    return Response.redirect(`${appUrl()}/gifts/${gift.id}/share`, 303);
  }

  try {
    // Changing the picks clears the order, because its amount may no longer cover them.
    if (!gift.paypal_order_id) throw new Error("Gift has no PayPal order");
    const { captureId, paidCents } = await capturePayment(gift.paypal_order_id);
    await markPaid(gift.id, captureId, paidCents);
    if (gift.card_id) await attachCard(gift.card_id, gift.id);
    return Response.redirect(`${appUrl()}/gifts/${gift.id}/share`, 303);
  } catch (error) {
    console.error("Could not finish PayPal payment", error);
    return Response.redirect(`${appUrl()}/gifts/${gift.id}/confirm?paypal=failed`, 303);
  }
}
