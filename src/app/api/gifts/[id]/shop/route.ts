import { z } from "zod";
import { getGift } from "@/lib/gifts";
import { isRateLimited } from "@/lib/rate-limit";
import { shopTurn } from "@/lib/shopper";

const Body = z.object({ text: z.string().trim().min(1).max(500) });

export async function POST(request: Request, { params }: RouteContext<"/api/gifts/[id]/shop">) {
  if (isRateLimited(request, "shop", 40, 60 * 60 * 1000)) {
    return Response.json({ error: "Let's take a short break. Try again soon." }, { status: 429 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Type a few words first." }, { status: 400 });
  }

  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "We couldn't find that gift." }, { status: 404 });

  try {
    const result = await shopTurn(gift, parsed.data.text);
    if (!result) {
      return Response.json({ error: "That's all the searches for this gift." }, { status: 409 });
    }
    return Response.json(result);
  } catch (error) {
    console.error("Shopping turn failed", error);
    return Response.json({ error: "That didn't work. Please try again." }, { status: 502 });
  }
}
