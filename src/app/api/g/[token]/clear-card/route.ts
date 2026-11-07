import { clearCard, getGiftByToken } from "@/lib/gifts";

/** Only a chosen gift can come off its card. One still waiting to be opened stays put. */
export async function POST(_request: Request, { params }: RouteContext<"/api/g/[token]/clear-card">) {
  const { token } = await params;
  const gift = await getGiftByToken(token);
  if (gift?.status !== "chosen" || !gift.card_id) {
    return Response.json({ error: "This card can't be cleared." }, { status: 409 });
  }

  await clearCard(gift.card_id, gift.id);
  return Response.json({ cardId: gift.card_id });
}
