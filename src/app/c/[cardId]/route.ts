import { appUrl, lookupCard } from "@/lib/gifts";

export async function GET(_request: Request, { params }: RouteContext<"/c/[cardId]">) {
  const { cardId } = await params;
  const card = await lookupCard(cardId);
  const targets = {
    gift: card.state === "gift" ? `/g/${card.token}` : "",
    blank: `/?card=${cardId}`,
    unknown: "/card-empty",
  };
  return Response.redirect(`${appUrl()}${targets[card.state]}`, 307);
}
