"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Shipping } from "@/lib/gifts";

type Pick = { id: string; title: string; imageUrl: string; price: string; details: string };

type Props = {
  giftId: string;
  recipientName: string;
  picks: Pick[];
  total: string;
  pricesDiffer: boolean;
  savedName: string;
  savedNote: string;
  savedShipping: Shipping | null;
  paypalFailed: boolean;
};

type Step = "message" | "address" | "review";

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

function Summary({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-3">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-sm font-bold tracking-normal text-soft">{label}</h2>
        <button type="button" className="text-sm font-semibold text-action" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="mt-1 wrap-anywhere">{children}</div>
    </section>
  );
}

export function ConfirmForm(props: Props) {
  const { giftId, recipientName, picks, total, pricesDiffer } = props;
  const finished = !!(props.savedName && props.savedNote && props.savedShipping);
  const [step, setStep] = useState<Step>(finished ? "review" : "message");
  const [giverName, setGiverName] = useState(props.savedName);
  const [note, setNote] = useState(props.savedNote || `Happy birthday, ${recipientName}!`);
  const [shipping, setShipping] = useState<Shipping>(
    props.savedShipping ?? {
      name: `${recipientName} Sample`,
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

  function address(field: keyof Shipping) {
    return {
      name: field,
      value: shipping[field],
      className: "field",
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
        <input {...address("name")} aria-label="Full name" placeholder="Full name" required maxLength={100} />
        <input {...address("line1")} aria-label="Street address" placeholder="Street address" required maxLength={120} />
        <input {...address("line2")} aria-label="Apartment or unit" placeholder="Apartment or unit (optional)" maxLength={120} />
        <div className="grid grid-cols-[1fr_5rem_7rem] gap-2">
          <input {...address("city")} aria-label="City" placeholder="City" required maxLength={80} />
          <input {...address("state")} aria-label="State" placeholder="State" required minLength={2} maxLength={2} />
          <input {...address("zip")} aria-label="ZIP code" placeholder="ZIP" required pattern="\d{5}(-\d{4})?" />
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
              <p className="line-clamp-2 font-semibold leading-snug">{pick.title}</p>
              {pick.details && <p className="text-sm text-soft">{pick.details}</p>}
            </div>
            <span className="tabular-nums">{pick.price}</span>
          </li>
        ))}
      </ul>
      <Summary label={`From ${giverName}`} onEdit={() => setStep("message")}>
        {note}
      </Summary>
      <Summary label="Ship to" onEdit={() => setStep("address")}>
        {shipping.name}, {shipping.line1}
        {shipping.line2 && `, ${shipping.line2}`}, {shipping.city}, {shipping.state} {shipping.zip}
      </Summary>
      <div className="mt-4 flex justify-between text-xl font-bold">
        <span>Total</span>
        <span className="tabular-nums">{total}</span>
      </div>
      {pricesDiffer && (
        <p className="mt-1 text-sm text-soft">
          That&apos;s the priciest gift. If {recipientName} picks a cheaper one, you get the difference
          back.
        </p>
      )}
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
