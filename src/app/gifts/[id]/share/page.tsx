import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { chosenGift } from "@/lib/checkout";
import { selectedOptions } from "@/lib/chat";
import { formatDollars, getGift, giftUrl, type Gift } from "@/lib/gifts";
import { CardSetup } from "./card-setup";
import { SendCard } from "./send-card";

type Props = PageProps<"/gifts/[id]/share">;

async function Result({ gift }: { gift: Gift }) {
  const chosen = await chosenGift(gift.id);
  if (!chosen) return <p className="mt-6 text-soft">We&apos;re finishing up this gift.</p>;

  return (
    <>
      <p className="mt-3 text-lg">
        {gift.recipient_name} chose <strong>{chosen.title}</strong>
        {Object.values(chosen.variant_choice_json).length > 0 &&
          ` (${Object.values(chosen.variant_choice_json).join(", ")})`}
        .
      </p>
      <p className="mt-1 text-soft">
        PayPal charged {formatDollars(chosen.price_cents)}. Shipping to{" "}
        {gift.shipping_json?.city}, {gift.shipping_json?.state} is simulated in this demo.
      </p>
      {chosen.thank_you_note && (
        <blockquote className="mt-6 rounded-2xl border border-line bg-paper p-5 text-lg">
          {chosen.thank_you_note}
        </blockquote>
      )}
    </>
  );
}

async function Share({ params }: Props) {
  await connection();
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (gift.status === "draft") redirect(`/gifts/${gift.id}/confirm`);
  if (gift.status !== "saved") return <Result gift={gift} />;

  const picks = await selectedOptions(gift.id);
  const url = giftUrl(gift.token);
  return (
    <>
      <p className="mt-2 text-soft">
        PayPal is saved with $0 charged. {gift.recipient_name} will unwrap {picks.length}{" "}
        {picks.length === 1 ? "gift" : "gifts"}, and you&apos;re charged when they choose, up to{" "}
        {formatDollars(gift.budget_cents)}.
      </p>
      <SendCard
        url={url}
        message={`${gift.giver_name} sent ${gift.recipient_name} a gift! Open it here: ${url}`}
      />
      <CardSetup giftId={gift.id} />
    </>
  );
}

export default function SharePage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mt-4 text-3xl font-semibold">Your gift</h1>
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Share {...props} />
      </Suspense>
    </main>
  );
}
