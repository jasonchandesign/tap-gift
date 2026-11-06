import { z } from "zod";
import { saveThankYou } from "@/lib/checkout";
import { getGiftByToken } from "@/lib/gifts";

const Body = z.object({ note: z.string().trim().min(1).max(500) });

export async function POST(request: Request, { params }: RouteContext<"/api/g/[token]/thank-you">) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Write a few words first." }, { status: 400 });

  const { token } = await params;
  const gift = await getGiftByToken(token);
  if (gift?.status !== "charged") {
    return Response.json({ error: "We couldn't find that gift." }, { status: 404 });
  }

  await saveThankYou(gift.id, parsed.data.note);
  return Response.json({ ok: true });
}
