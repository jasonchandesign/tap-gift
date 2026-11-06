import { appUrl, getGift, markSaved } from "@/lib/gifts";
import { savePaymentToken } from "@/lib/paypal";

/** PayPal sends the buyer here after approval. This finishes saving their account. */
export async function GET(request: Request) {
  const giftId = new URL(request.url).searchParams.get("gift") ?? "";
  const gift = await getGift(giftId);
  if (!gift) return Response.redirect(`${appUrl()}/`, 303);

  if (gift.status !== "draft") {
    return Response.redirect(`${appUrl()}/gifts/${gift.id}/share`, 303);
  }

  try {
    if (!gift.setup_token_id) throw new Error("Gift has no setup token");
    const { vaultId, customerId } = await savePaymentToken(gift.setup_token_id);
    await markSaved(gift.id, vaultId, customerId);
    return Response.redirect(`${appUrl()}/gifts/${gift.id}/share`, 303);
  } catch (error) {
    console.error("Could not finish PayPal save", error);
    return Response.redirect(`${appUrl()}/gifts/${gift.id}/confirm?paypal=failed`, 303);
  }
}
