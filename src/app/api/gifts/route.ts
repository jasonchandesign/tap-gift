import { z } from "zod";
import { createGift, getGift } from "@/lib/gifts";
import { isRateLimited } from "@/lib/rate-limit";
import { shopTurn } from "@/lib/shopper";

const Body = z.object({
  giverName: z.string().trim().min(1).max(60),
  recipientName: z.string().trim().min(1).max(60),
  recipientAge: z.number().int().min(1).max(17),
  prompt: z.string().trim().min(1).max(500),
});

export async function POST(request: Request) {
  if (isRateLimited(request, "gifts", 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many gifts for now. Try again in a while." }, { status: 429 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const { prompt, ...form } = parsed.data;

  const id = await createGift({ ...form, rules: { likes: [], avoid: [] } });
  const gift = await getGift(id);

  // The gift still exists if this fails, so the shop page can simply try again.
  if (gift) await shopTurn(gift, prompt).catch((error) => console.error("First turn failed", error));
  return Response.json({ id });
}
