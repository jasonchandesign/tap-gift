import { z } from "zod";
import { cardIsFree, createGift } from "@/lib/gifts";
import { isRateLimited } from "@/lib/rate-limit";
import { AUDIENCE_IDS, SKIN_IDS } from "@/lib/skins";

const Body = z.object({
  recipientName: z.string().trim().min(1).max(60),
  recipientAge: z.number().int().min(1).max(17),
  skin: z.enum(SKIN_IDS),
  audience: z.enum(AUDIENCE_IDS),
  cardId: z.string().optional(),
});

export async function POST(request: Request) {
  if (isRateLimited(request, "gifts", 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many gifts for now. Try again in a while." }, { status: 429 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const { cardId, ...form } = parsed.data;
  const freeCard = cardId && (await cardIsFree(cardId)) ? cardId : undefined;

  const id = await createGift({ ...form, cardId: freeCard, rules: { likes: [], avoid: [] } });
  return Response.json({ id });
}
