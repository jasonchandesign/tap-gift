"use client";

import { useState, type FormEvent } from "react";
import type { Shipping } from "@/lib/gifts";

type Props = {
  giftId: string;
  giverName: string;
  recipientName: string;
  total: string;
  pricesDiffer: boolean;
  savedNote: string;
  savedShipping: Shipping | null;
  paypalFailed: boolean;
};

export function ConfirmForm(props: Props) {
  const { giftId, giverName, recipientName, total, pricesDiffer } = props;
  const [error, setError] = useState(
    props.paypalFailed ? "We couldn't finish the payment. Please try again." : "",
  );
  const [busy, setBusy] = useState(false);
  const shipping = props.savedShipping ?? {
    name: `${recipientName} Sample`,
    line1: "123 Sample Street",
    line2: "",
    city: "San Jose",
    state: "CA",
    zip: "95131",
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/paypal/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giftId,
          note: form.get("note"),
          shipping: {
            name: form.get("name"),
            line1: form.get("line1"),
            line2: form.get("line2"),
            city: form.get("city"),
            state: form.get("state"),
            zip: form.get("zip"),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.redirect);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 font-medium">
        Your note to {recipientName}
        <textarea
          name="note"
          className="field"
          rows={3}
          required
          maxLength={1000}
          defaultValue={props.savedNote || `Happy birthday, ${recipientName}! Love, ${giverName}`}
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium">Where should it ship?</legend>
        <p className="text-sm text-soft">
          This is a demo with a sample address filled in. Nothing is really shipped.
        </p>
        <input
          name="name"
          className="field"
          aria-label="Full name"
          placeholder="Full name"
          defaultValue={shipping.name}
          required
          maxLength={100}
        />
        <input
          name="line1"
          className="field"
          aria-label="Street address"
          placeholder="Street address"
          defaultValue={shipping.line1}
          required
          maxLength={120}
        />
        <input
          name="line2"
          className="field"
          aria-label="Apartment or unit"
          placeholder="Apartment or unit (optional)"
          defaultValue={shipping.line2}
          maxLength={120}
        />
        <div className="grid grid-cols-[1fr_5rem_7rem] gap-2">
          <input
            name="city"
            className="field"
            aria-label="City"
            placeholder="City"
            defaultValue={shipping.city}
            required
            maxLength={80}
          />
          <input
            name="state"
            className="field"
            aria-label="State"
            placeholder="State"
            defaultValue={shipping.state}
            required
            minLength={2}
            maxLength={2}
          />
          <input
            name="zip"
            className="field"
            aria-label="ZIP code"
            placeholder="ZIP"
            defaultValue={shipping.zip}
            required
            pattern="\d{5}(-\d{4})?"
          />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-berry">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={busy}>
        {busy ? "Opening PayPal..." : `Pay ${total} with PayPal`}
      </button>
      {pricesDiffer && (
        <p className="text-center text-sm text-soft">
          If they choose something cheaper, you get the difference back.
        </p>
      )}
    </form>
  );
}
