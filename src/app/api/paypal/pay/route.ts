import { z } from "zod";
import { selectedOptions } from "@/lib/chat";
import { appUrl, getGift, saveDelivery, setPayPalOrder, ShippingSchema } from "@/lib/gifts";
import { createPayment } from "@/lib/paypal";

const Body = z.object({
  giftId: z.string(),
  note: z.string().trim().min(1).max(1000),
  shipping: ShippingSchema,
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the note and address." }, { status: 400 });
  }
  const { giftId, note, shipping } = parsed.data;

  const gift = await getGift(giftId);
  if (!gift) return Response.json({ error: "We couldn't find that gift." }, { status: 404 });
  if (gift.status !== "draft") {
    return Response.json({ redirect: `/gifts/${gift.id}/share` });
  }
  const picks = await selectedOptions(gift.id);
  if (!picks.length) {
    return Response.json({ redirect: `/gifts/${gift.id}/shop` });
  }

  try {
    await saveDelivery(gift.id, note, shipping);
    const { orderId, approveUrl } = await createPayment({
      // The priciest pick, so any choice is covered. A cheaper choice refunds the difference.
      amountCents: Math.max(...picks.map((pick) => pick.price_cents)),
      shipping,
      returnUrl: `${appUrl()}/api/paypal/return?gift=${gift.id}`,
      cancelUrl: `${appUrl()}/gifts/${gift.id}/confirm`,
    });
    await setPayPalOrder(gift.id, orderId);
    return Response.json({ redirect: approveUrl });
  } catch (error) {
    console.error("Could not start PayPal payment", error);
    return Response.json({ error: "PayPal isn't responding. Please try again." }, { status: 502 });
  }
}
