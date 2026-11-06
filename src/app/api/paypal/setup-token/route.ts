import { z } from "zod";
import { appUrl, confirmRules, getGift, RulesSchema, setSetupToken } from "@/lib/gifts";
import { createSetupToken } from "@/lib/paypal";

const Body = z.object({
  giftId: z.string(),
  budgetDollars: z.number().min(1).max(500),
  recipientAge: z.number().int().min(1).max(17),
  rules: RulesSchema,
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the details and try again." }, { status: 400 });
  }
  const { giftId, budgetDollars, recipientAge, rules } = parsed.data;

  const gift = await getGift(giftId);
  if (!gift) return Response.json({ error: "We couldn't find that gift." }, { status: 404 });
  if (gift.status !== "draft") {
    return Response.json({ redirect: `/gifts/${gift.id}/share` });
  }

  try {
    await confirmRules(gift.id, {
      budgetCents: Math.round(budgetDollars * 100),
      recipientAge,
      rules,
    });
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
