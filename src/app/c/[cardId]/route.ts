import { appUrl, lookupCard } from "@/lib/gifts";

export async function GET(_request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const card = await lookupCard(cardId);
  const target = card.state === "ready" ? `/g/${card.token}` : "/card-empty";
  return Response.redirect(`${appUrl()}${target}`, 307);
}
