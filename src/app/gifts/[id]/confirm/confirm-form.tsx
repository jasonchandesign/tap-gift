"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { costliest, estimateCost, type Cost } from "@/lib/costs";
import type { Shipping } from "@/lib/gifts";
import { formatDollars } from "@/lib/gifts-format";

type Pick = {
  id: string;
  title: string;
  imageUrl: string;
  priceCents: number;
  merchant: string;
  details: string;
};

type Props = {
  giftId: string;
  recipientName: string;
  recipientLastName: string;
  picks: Pick[];
  savedName: string;
  savedNote: string;
  savedShipping: Shipping | null;
  paypalFailed: boolean;
};

type Step = "message" | "address" | "review";

const FIELD_LABEL = "flex min-w-0 flex-col gap-1 text-sm font-semibold text-soft";

const PENCIL_ICON = (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
  </svg>
);

const BACK_ICON = (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

function Heading({ title, onBack, href }: { title: string; onBack?: () => void; href?: string }) {
  return (
    <header className="-ml-2 flex items-center gap-1 pb-3">
      {href ? (
        <Link href={href} className="icon-button text-action" aria-label="Back to cart">
          {BACK_ICON}
        </Link>
      ) : (
        <button type="button" className="icon-button text-action" aria-label="Back" onClick={onBack}>
          {BACK_ICON}
        </button>
      )}
      <h1 className="text-2xl font-semibold">{title}</h1>
    </header>
  );
}

type SummaryProps = { label: string; editLabel: string; onEdit: () => void; children: React.ReactNode };

function Summary({ label, editLabel, onEdit, children }: SummaryProps) {
  return (
    <section className="flex items-start gap-3 border-b border-line py-3">
      <div className="min-w-0 flex-1">
        <h2 className="font-sans text-base font-bold tracking-normal text-soft">{label}</h2>
        <div className="mt-1 wrap-anywhere">{children}</div>
      </div>
      <button type="button" className="icon-button -mr-2 -mt-1.5 text-action" aria-label={editLabel} onClick={onEdit}>
        {PENCIL_ICON}
      </button>
    </section>
  );
}

function Row({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt>{label}</dt>
      <dd className="tabular-nums">{cents === 0 ? "Free" : formatDollars(cents)}</dd>
    </div>
  );
}

/** One pick's cost to send: price, its store's shipping and tax. */
function CostLine({ cost, merchant }: { cost: Cost; merchant: string }) {
  const shipping = cost.shipping_cents ? `${formatDollars(cost.shipping_cents)} shipping` : "free shipping";
  return (
    <p className="text-sm tabular-nums text-soft">
      {formatDollars(cost.item_cents)} + {shipping}
      {cost.tax_cents > 0 && ` + ${formatDollars(cost.tax_cents)} tax`} ={" "}
      <span className="font-semibold text-ink">{formatDollars(cost.total_cents)}</span>
      {merchant && <span className="block">Ships from {merchant}</span>}
    </p>
  );
}

export function ConfirmForm(props: Props) {
  const { giftId, recipientName } = props;
  const finished = !!(props.savedName && props.savedNote && props.savedShipping);
  const [step, setStep] = useState<Step>(finished ? "review" : "message");
  const [giverName, setGiverName] = useState(props.savedName);
  const [note, setNote] = useState(props.savedNote || `Happy birthday, ${recipientName}!`);
  const [shipping, setShipping] = useState<Shipping>(
    props.savedShipping ?? {
      name: `${recipientName} ${props.recipientLastName}`.trim(),
      line1: "123 Sample Street",
      line2: "",
      city: "San Jose",
      state: "CA",
      zip: "95131",
    },
  );
  const [error, setError] = useState(
    props.paypalFailed ? "We couldn't finish the payment. Please try again." : "",
  );
  const [busy, setBusy] = useState(false);

  // The same estimate the pay route charges: each pick sent to this state, and the costliest one.
  const picks = props.picks.map((pick) => ({ ...pick, cost: estimateCost(pick.priceCents, shipping.state) }));
  const most = costliest(picks);
  const total = formatDollars(most.cost.total_cents);
  const costsDiffer = new Set(picks.map((pick) => pick.cost.total_cents)).size > 1;

  function address(field: keyof Shipping) {
    return {
      name: field,
      value: shipping[field],
      className: "field font-normal text-ink",
      onChange: (event: { target: { value: string } }) =>
        setShipping((current) => ({ ...current, [field]: event.target.value })),
    };
  }

  async function pay() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/paypal/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId, giverName, note, shipping }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.redirect);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  function goTo(next: Step) {
    return (event: FormEvent) => {
      event.preventDefault();
      setStep(next);
    };
  }

  if (step === "message") {
    return (
      <form onSubmit={goTo("address")} className="flex flex-col gap-4">
        <Heading title="Your message" href={`/gifts/${giftId}/shop?cart`} />
        <label className="flex flex-col gap-1 font-medium">
          Your name
          <input
            className="field"
            value={giverName}
            onChange={(event) => setGiverName(event.target.value)}
            autoComplete="name"
            required
            maxLength={60}
          />
        </label>
        <label className="flex flex-col gap-1 font-medium">
          Message to {recipientName}
          <textarea
            className="field"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            required
            maxLength={1000}
          />
        </label>
        <button type="submit" className="button">
          Continue
        </button>
      </form>
    );
  }

  if (step === "address") {
    return (
      <form onSubmit={goTo("review")} className="flex flex-col gap-3">
        <Heading title="Where should it ship?" onBack={() => setStep("message")} />
        <p className="text-sm text-soft">
          This is a demo with a sample address filled in. Nothing is really shipped.
        </p>
        <label className={FIELD_LABEL}>
          {recipientName}&apos;s full name
          <input {...address("name")} autoComplete="name" required maxLength={100} />
          <span className="font-normal">For the shipping label only. The gift tag still says {recipientName}.</span>
        </label>
        <label className={FIELD_LABEL}>
          Street address
          <input {...address("line1")} autoComplete="address-line1" required maxLength={120} />
        </label>
        <label className={FIELD_LABEL}>
          Apartment or unit (optional)
          <input {...address("line2")} autoComplete="address-line2" maxLength={120} />
        </label>
        <div className="grid grid-cols-[1fr_5rem_7rem] gap-2">
          <label className={FIELD_LABEL}>
            City
            <input {...address("city")} autoComplete="address-level2" required maxLength={80} />
          </label>
          <label className={FIELD_LABEL}>
            State
            <input {...address("state")} autoComplete="address-level1" required minLength={2} maxLength={2} />
          </label>
          <label className={FIELD_LABEL}>
            ZIP
            <input {...address("zip")} autoComplete="postal-code" required pattern="\d{5}(-\d{4})?" />
          </label>
        </div>
        <button type="submit" className="button mt-1">
          Continue
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col">
      <Heading title="Confirm your gift" onBack={() => setStep("address")} />
      <ul>
        {picks.map((pick) => (
          <li key={pick.id} className="flex items-center gap-3 border-b border-line py-2.5">
            {/* Images come from many stores, so next/image can't list their hosts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pick.imageUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-14 shrink-0 rounded-lg border border-line bg-white object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-bold leading-snug">{pick.title}</p>
              {pick.details && <p className="text-sm text-soft">{pick.details}</p>}
              <CostLine cost={pick.cost} merchant={pick.merchant} />
            </div>
          </li>
        ))}
      </ul>
      <Summary label={`From ${giverName}`} editLabel="Edit your message" onEdit={() => setStep("message")}>
        {note}
      </Summary>
      <Summary label="Ship to" editLabel="Edit the address" onEdit={() => setStep("address")}>
        <p>{shipping.name}</p>
        <p>
          {shipping.line1}
          {shipping.line2 && `, ${shipping.line2}`}
        </p>
        <p>
          {shipping.city}, {shipping.state} {shipping.zip}
        </p>
      </Summary>
      <dl className="mt-4 text-soft">
        <Row label={costsDiffer ? "Costliest gift" : "Gift"} cents={most.cost.item_cents} />
        <Row label="Shipping (est.)" cents={most.cost.shipping_cents} />
        <Row label={`Tax (est., ${most.cost.state} ${most.cost.tax_rate}%)`} cents={most.cost.tax_cents} />
      </dl>
      <div className="mt-1 flex justify-between border-t border-line pt-2 text-xl font-bold">
        <span>Total</span>
        <span className="tabular-nums">{total}</span>
      </div>
      <p className="mt-1 text-sm text-soft">
        {costsDiffer
          ? `Enough for any of them. After ${recipientName} chooses, you get back whatever their gift doesn't use, shipping and tax included.`
          : `Covers whichever one ${recipientName} chooses, shipping and tax included.`}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-alert">
          {error}
        </p>
      )}
      <button type="button" className="button mt-4" disabled={busy} onClick={pay}>
        {busy ? "Opening PayPal..." : `Pay ${total} with PayPal`}
      </button>
    </div>
  );
}
