import { z } from "zod";
import { cardUrl, createCard, getGift, relinkCard } from "@/lib/gifts";

const Body = z.object({ existingCardUrl: z.string().trim().max(300).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "That didn't look right." }, { status: 400 });

  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "We couldn't find that gift." }, { status: 404 });
  if (gift.status !== "paid") {
    return Response.json({ error: "This gift can't be linked to a card." }, { status: 409 });
  }

  const existing = parsed.data.existingCardUrl;
  if (!existing) {
    return Response.json({ cardUrl: cardUrl(await createCard(gift.id)) });
  }

  const cardId = existing.match(/\/c\/([\w-]+)\/?$/)?.[1];
  if (!cardId) {
    return Response.json({ error: "Paste the full card link, ending in /c/ and its ID." }, { status: 400 });
  }
  if (!(await relinkCard(cardId, gift.id))) {
    return Response.json(
      { error: "That card is unknown, or it still holds a gift in progress." },
      { status: 409 },
    );
  }
  return Response.json({ cardUrl: cardUrl(cardId) });
}
