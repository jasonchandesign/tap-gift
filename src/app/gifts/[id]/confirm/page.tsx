import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { selectedOptions, type ShownOption } from "@/lib/chat";
import { formatDollars, getGift } from "@/lib/gifts";
import { variantSummary } from "@/lib/gifts-format";
import { ConfirmForm } from "./confirm-form";

type Props = PageProps<"/gifts/[id]/confirm">;

function describe(pick: ShownOption) {
  const size = Object.values(pick.variant_choice_json).map((value) => `Size ${value}`);
  return [...size, variantSummary(pick.variants_json)].filter(Boolean).join(", ");
}

async function Confirm({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { paypal } = await searchParams;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (gift.status !== "draft") redirect(`/gifts/${gift.id}/share`);

  const picks = await selectedOptions(gift.id);
  if (!picks.length) redirect(`/gifts/${gift.id}/shop`);

  const prices = picks.map((pick) => pick.price_cents);

  return (
    <ConfirmForm
      giftId={gift.id}
      recipientName={gift.recipient_name}
      recipientLastName={gift.recipient_last_name}
      picks={picks.map((pick) => ({
        id: pick.id,
        title: pick.title,
        imageUrl: pick.image_url,
        price: formatDollars(pick.price_cents),
        details: describe(pick),
      }))}
      total={formatDollars(Math.max(...prices))}
      pricesDiffer={new Set(prices).size > 1}
      savedName={gift.giver_name}
      savedNote={gift.note}
      savedShipping={gift.shipping_json}
      paypalFailed={paypal === "failed"}
    />
  );
}

export default function ConfirmPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-6 pt-2">
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Confirm {...props} />
      </Suspense>
    </main>
  );
}
