import { z } from "zod";
import { addPick, MAX_PICKS, removePick } from "@/lib/chat";
import { getGift } from "@/lib/gifts";

const Body = z.object({
  // Postgres sends these IDs as strings and the local database sends numbers.
  optionId: z.coerce.string().regex(/^\d+$/),
  /** The sizes for a gift going in the cart, or null to take it out. */
  choice: z.record(z.string(), z.string()).nullable(),
});

const PROBLEMS = {
  full: { error: `Your cart holds up to ${MAX_PICKS} gifts.`, status: 409 },
  size: { error: "Choose a size for this gift first.", status: 400 },
  missing: { error: "We couldn't find that gift.", status: 404 },
};

export async function POST(request: Request, { params }: RouteContext<"/api/gifts/[id]/picks">) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "That didn't save. Please try again." }, { status: 400 });
  }

  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "We couldn't find that gift." }, { status: 404 });
  if (gift.status !== "draft") {
    return Response.json({ error: "This gift has already been sent." }, { status: 409 });
  }

  const { optionId, choice } = parsed.data;
  if (!choice) {
    await removePick(gift.id, optionId);
    return Response.json({ ok: true });
  }

  const result = await addPick(gift.id, optionId, choice);
  if (result === "saved") return Response.json({ ok: true });
  const { error, status } = PROBLEMS[result];
  return Response.json({ error }, { status });
}
