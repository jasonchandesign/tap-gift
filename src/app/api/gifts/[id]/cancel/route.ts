import { cancelGift, settleRefund } from "@/lib/checkout";
import { getGift } from "@/lib/gifts";

export async function POST(_request: Request, { params }: RouteContext<"/api/gifts/[id]/cancel">) {
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "We couldn't find that gift." }, { status: 404 });

  if (!(await cancelGift(gift.id))) {
    return Response.json({ error: "This gift can't be canceled now." }, { status: 409 });
  }
  // If this refund fails it stays owed, and the share page shows that and retries.
  await settleRefund(gift.id);
  return Response.json({ ok: true });
}
