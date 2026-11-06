import { z } from "zod";
import { parseNote } from "@/lib/claude";
import { createGift } from "@/lib/gifts";
import { isRateLimited } from "@/lib/rate-limit";

const Body = z.object({
  giverName: z.string().trim().min(1).max(60),
  recipientName: z.string().trim().min(1).max(60),
  recipientAge: z.number().int().min(1).max(17),
  budgetDollars: z.number().min(1).max(500),
  note: z.string().trim().min(1).max(1000),
  parentContact: z.string().trim().min(3).max(120),
});

export async function POST(request: Request) {
  if (isRateLimited(request, "gifts", 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many gifts for now. Try again in a while." }, { status: 429 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const form = parsed.data;

  try {
    const { likes, avoid, intent, note_budget_dollars, note_age } = await parseNote(form.note);
    const id = await createGift({
      giverName: form.giverName,
      recipientName: form.recipientName,
      recipientAge: form.recipientAge,
      budgetCents: Math.round(form.budgetDollars * 100),
      note: form.note,
      parentContact: form.parentContact,
      rules: { likes, avoid, intent },
    });
    const mismatch =
      (note_budget_dollars !== null && note_budget_dollars !== form.budgetDollars) ||
      (note_age !== null && note_age !== form.recipientAge);
    return Response.json({ id, mismatch });
  } catch (error) {
    console.error("Could not create gift", error);
    return Response.json(
      { error: "We couldn't read that note just now. Please try again." },
      { status: 502 },
    );
  }
}
