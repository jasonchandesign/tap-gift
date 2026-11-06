import { z } from "zod";
import { selectedOptions } from "@/lib/chat";
import { appUrl, getGift, saveDelivery, setSetupToken, ShippingSchema } from "@/lib/gifts";
import { createSetupToken } from "@/lib/paypal";

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
  if (!(await selectedOptions(gift.id)).length) {
    return Response.json({ redirect: `/gifts/${gift.id}/shop` });
  }

  try {
    await saveDelivery(gift.id, note, shipping);
    const { setupTokenId, approveUrl } = await createSetupToken(
      `${appUrl()}/api/paypal/return?gift=${gift.id}`,
      `${appUrl()}/gifts/${gift.id}/confirm`,
    );
    await setSetupToken(gift.id, setupTokenId);
    return Response.json({ redirect: approveUrl });
  } catch (error) {
    console.error("Could not start PayPal save", error);
    return Response.json({ error: "PayPal isn't responding. Please try again." }, { status: 502 });
  }
}
