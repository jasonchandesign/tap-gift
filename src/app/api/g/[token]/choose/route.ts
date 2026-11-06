import { z } from "zod";
import { chooseGift } from "@/lib/checkout";
import { getGiftByToken } from "@/lib/gifts";

const Body = z.object({
  optionId: z.string().regex(/^\d+$/),
  choice: z.record(z.string(), z.string()),
});

const FAILURES = {
  taken: { status: 409, error: "This gift has already been chosen." },
  unavailable: { status: 409, error: "That one just sold out. Please choose another." },
  variant: { status: 400, error: "Pick your color or size first." },
  failed: { status: 502, error: "That didn't go through. Please try again." },
};

export async function POST(request: Request, { params }: RouteContext<"/api/g/[token]/choose">) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a gift first." }, { status: 400 });

  const { token } = await params;
  const gift = await getGiftByToken(token);
  if (!gift) return Response.json({ error: "We couldn't find that gift." }, { status: 404 });

  const result = await chooseGift(gift, parsed.data.optionId, parsed.data.choice);
  if (result === "charged") return Response.json({ ok: true });

  const { status, error } = FAILURES[result];
  return Response.json({ error, result }, { status });
}
