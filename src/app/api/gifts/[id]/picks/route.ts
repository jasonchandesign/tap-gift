import { z } from "zod";
import { MAX_PICKS, savePicks } from "@/lib/chat";
import { getGift } from "@/lib/gifts";

const Body = z.object({
  picks: z
    .array(
      z.object({
        optionId: z.string().regex(/^\d+$/),
        choice: z.record(z.string(), z.string()),
      }),
    )
    .min(1)
    .max(MAX_PICKS),
});

export async function POST(request: Request, { params }: RouteContext<"/api/gifts/[id]/picks">) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: `Choose 1 to ${MAX_PICKS} gifts.` }, { status: 400 });
  }

  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "We couldn't find that gift." }, { status: 404 });
  if (gift.status !== "draft") {
    return Response.json({ error: "This gift has already been sent." }, { status: 409 });
  }

  if (!(await savePicks(gift.id, parsed.data.picks))) {
    return Response.json({ error: "Choose a size for each gift that has one." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
