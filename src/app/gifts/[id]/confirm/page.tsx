import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { selectedOptions, type ShownOption } from "@/lib/chat";
import { formatDollars, getGift } from "@/lib/gifts";
import { variantSummary } from "@/lib/gifts-format";
import { ConfirmForm } from "./confirm-form";

type Props = PageProps<"/gifts/[id]/confirm">;

function describe(pick: ShownOption) {
  const size = Object.values(pick.variant_choice_json).map((value) => `size ${value}`);
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

  return (
    <>
      <ul className="mt-4 flex flex-col gap-1">
        {picks.map((pick) => (
          <li key={pick.id} className="flex justify-between gap-4">
            <span>
              {pick.title}
              {describe(pick) && ` (${describe(pick)})`}
            </span>
            <span className="font-semibold">{formatDollars(pick.price_cents)}</span>
          </li>
        ))}
      </ul>
      <ConfirmForm
        giftId={gift.id}
        giverName={gift.giver_name}
        recipientName={gift.recipient_name}
        maxCharge={formatDollars(Math.max(...picks.map((pick) => pick.price_cents)))}
        savedNote={gift.note}
        savedShipping={gift.shipping_json}
        paypalFailed={paypal === "failed"}
      />
    </>
  );
}

export default function ConfirmPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mt-4 text-3xl font-semibold">Finish your gift</h1>
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Confirm {...props} />
      </Suspense>
    </main>
  );
}
