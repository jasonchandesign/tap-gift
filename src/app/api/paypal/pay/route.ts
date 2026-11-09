import { after } from "next/server";
import { z } from "zod";
import { saveCosts } from "@/lib/checkout";
import { selectedOptions } from "@/lib/chat";
import { costliest, estimateCost } from "@/lib/costs";
import { appUrl, getGift, saveDelivery, setPayPalOrder, ShippingSchema } from "@/lib/gifts";
import { createPayment } from "@/lib/paypal";
import { drawWraps } from "@/lib/wraps";

const Body = z.object({
  giftId: z.string(),
  giverName: z.string().trim().min(1).max(60),
  note: z.string().trim().min(1).max(1000),
  shipping: ShippingSchema,
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check your name, note and address." }, { status: 400 });
  }
  const { giftId, giverName, note, shipping } = parsed.data;

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
    await saveDelivery(gift.id, giverName, note, shipping);
    // Each pick's price, shipping and tax, kept so the refund later uses the same numbers.
    const costed = picks.map((pick) => ({ ...pick, cost: estimateCost(pick.price_cents, shipping.state) }));
    await saveCosts(costed);
    // The pick that costs the most to send, so any choice is covered. A cheaper one refunds the rest.
    const most = costliest(costed);
    const { orderId, approveUrl } = await createPayment({
      cost: most.cost,
      item: {
        name: `A gift for ${gift.recipient_name}: their pick of ${picks.length}`,
        description: picks.map((pick) => pick.title).join(" / "),
      },
      shipping,
      returnUrl: `${appUrl()}/api/paypal/return?gift=${gift.id}`,
      cancelUrl: `${appUrl()}/gifts/${gift.id}/confirm`,
    });
    await setPayPalOrder(gift.id, orderId);
    // Ready by the time the kid opens it. Until then, each gift has a ready-made pattern.
    after(() => drawWraps(gift.id));
    return Response.json({ redirect: approveUrl });
  } catch (error) {
    console.error("Could not start PayPal payment", error);
    return Response.json({ error: "PayPal isn't responding. Please try again." }, { status: 502 });
  }
}
