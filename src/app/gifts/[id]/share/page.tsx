import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { chosenGift, settleRefund, type ChosenGift } from "@/lib/checkout";
import { selectedOptions } from "@/lib/chat";
import { formatDollars, getGift, giftUrl, isDemoCard, type Gift } from "@/lib/gifts";
import { skinStyle } from "@/lib/skins";
import { DemoToast } from "../../../demo-toast";
import { Bow, GiftTag } from "../../../gift-wrap";
import { CancelGift } from "./cancel-gift";
import { SendCard } from "./send-card";

type Props = PageProps<"/gifts/[id]/share">;

function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="mt-4 text-3xl font-semibold">{children}</h1>;
}

/** Loading this also retries a refund that failed earlier. */
async function RefundNote({ gift }: { gift: Gift }) {
  if (gift.refund_cents === 0) return null;
  const amount = formatDollars(gift.refund_cents);
  return (await settleRefund(gift.id))
    ? `${amount} is going back to your PayPal.`
    : `We still owe you ${amount}. Reload this page to try again.`;
}

function Line({ label, cents, strong }: { label: React.ReactNode; cents: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1 ${strong ? "font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{cents === 0 && !strong ? "Free" : formatDollars(cents)}</dd>
    </div>
  );
}

/** What the gifter paid, what the kid's choice really cost, and what goes back. */
function Receipt({ gift, chosen }: { gift: Gift; chosen: ChosenGift }) {
  const { cost } = chosen;
  const paid = gift.paid_cents ?? cost.total_cents;
  return (
    <dl className="mt-4 rounded-2xl border border-line bg-paper px-4 py-3">
      <Line label="You paid" cents={paid} strong />
      <div className="my-1 border-t border-line" />
      <Line label={`${gift.recipient_name}'s gift`} cents={cost.item_cents} />
      <Line label={`Shipping${chosen.merchant ? ` from ${chosen.merchant}` : ""}`} cents={cost.shipping_cents} />
      {cost.tax_rate > 0 && <Line label={`Tax (${cost.state}, ${cost.tax_rate}%)`} cents={cost.tax_cents} />}
      <Line label="Gift total" cents={cost.total_cents} />
      <div className="my-1 border-t border-line" />
      <Line label="Back to your PayPal" cents={gift.refund_cents} strong />
    </dl>
  );
}

async function Result({ gift }: { gift: Gift }) {
  if (gift.status === "canceled") {
    return (
      <>
        <Title>Your gift</Title>
        <p className="mt-3 text-lg">
          You canceled this gift. <RefundNote gift={gift} />
        </p>
      </>
    );
  }

  const chosen = await chosenGift(gift.id);
  if (!chosen) return <p className="mt-6 text-soft">We&apos;re finishing up this gift.</p>;

  return (
    <>
      <Title>Your gift</Title>
      <p className="mt-3 text-lg">
        {gift.recipient_name} chose <strong>{chosen.title}</strong>
        {Object.values(chosen.variant_choice_json).length > 0 &&
          ` (${Object.values(chosen.variant_choice_json).join(", ")})`}
        .
      </p>
      <Receipt gift={gift} chosen={chosen} />
      <p className="mt-2 text-sm text-soft">
        <RefundNote gift={gift} /> Shipping and tax are estimates, and shipping to{" "}
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

/** The wrapped gift across the top of the screen, ready to hand over or send. */
function WrappedTop({ gift }: { gift: Gift }) {
  return (
    <div className="relative left-1/2 -mt-6 w-screen -translate-x-1/2" style={skinStyle(gift.skin)}>
      <div className="wrap-paper flex h-[48dvh] min-h-64 flex-col items-center justify-between pb-8">
        <Bow className="relative w-40" />
        <div className="relative">
          <GiftTag recipientName={gift.recipient_name} small />
        </div>
      </div>
    </div>
  );
}

async function Share({ params }: Props) {
  await connection();
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (gift.status === "draft") redirect(`/gifts/${gift.id}/confirm`);
  if (gift.status !== "paid") return <Result gift={gift} />;

  const picks = await selectedOptions(gift.id);
  const url = giftUrl(gift.token);
  const paid = formatDollars(gift.paid_cents ?? gift.budget_cents);
  const pricesDiffer = new Set(picks.map((pick) => pick.price_cents)).size > 1;

  if (!picks.length) {
    return (
      <>
        <Title>Your gift</Title>
        <p className="mt-3 text-lg">
          Every gift you kept sold out before {gift.recipient_name} chose. You can get your {paid}{" "}
          back and start a new gift.
        </p>
        <CancelGift giftId={gift.id} recipientName={gift.recipient_name} paid={paid} />
      </>
    );
  }

  const summary = (
    <p className="mt-3 text-soft">
      You paid {paid}. {gift.recipient_name} will unwrap {picks.length}{" "}
      {picks.length === 1 ? "gift" : "gifts"}
      {pricesDiffer ? ", and you get the difference back if they choose a cheaper one." : "."}
    </p>
  );

  if (gift.delivery === "card") {
    return (
      <div className="text-center">
        <WrappedTop gift={gift} />
        <h1 className="mt-6 text-4xl font-semibold">Hand the card to {gift.recipient_name}</h1>
        <p className="mt-3 text-lg">It&apos;s all set. They just tap it with a phone.</p>
        {summary}
        <CancelGift giftId={gift.id} recipientName={gift.recipient_name} paid={paid} />
        {isDemoCard(gift.card_id) && (
          <DemoToast action={`Tap the card as ${gift.recipient_name}`} href={`/c/${gift.card_id}`}>
            Demo for an NFC card experience. When {gift.recipient_name} taps on a real card on the
            phone, they&apos;ll be able to unwrap gifts.
          </DemoToast>
        )}
      </div>
    );
  }

  return (
    <div className="text-center">
      <WrappedTop gift={gift} />
      <h1 className="mt-6 text-4xl font-semibold">Send it to {gift.recipient_name}</h1>
      {summary}
      <SendCard
        url={url}
        shareText={`${gift.giver_name} sent ${gift.recipient_name} a gift! Open it here: ${url}`}
        emailSubject={`${gift.giver_name} sent ${gift.recipient_name} a gift`}
        emailBody={[
          "Hi!",
          "",
          `${gift.giver_name} sent ${gift.recipient_name} a gift. Open this link on a phone to unwrap ${
            picks.length === 1 ? "it" : `${picks.length} surprises and pick one to keep`
          }:`,
          "",
          url,
        ].join("\n")}
      />
      <CancelGift giftId={gift.id} recipientName={gift.recipient_name} paid={paid} />
      <DemoToast action={`Open it as ${gift.recipient_name}`} href={url}>
        {gift.recipient_name} gets this link by text or email. Try to unwrap the gifts the way they
        will.
      </DemoToast>
    </div>
  );
}

export default function SharePage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Share {...props} />
      </Suspense>
    </main>
  );
}
