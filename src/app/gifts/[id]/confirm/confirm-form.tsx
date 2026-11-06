"use client";

import { useState, type FormEvent } from "react";
import type { Rules } from "@/lib/gifts";

type Props = {
  giftId: string;
  recipientName: string;
  budgetDollars: number;
  recipientAge: number;
  rules: Rules;
  noteMismatch: boolean;
  paypalFailed: boolean;
};

function toList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ConfirmForm(props: Props) {
  const { giftId, recipientName, budgetDollars, recipientAge, rules } = props;
  const [error, setError] = useState(
    props.paypalFailed ? "We couldn't finish saving PayPal. Please try again." : "",
  );
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/paypal/setup-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giftId,
          budgetDollars: Number(form.get("budgetDollars")),
          recipientAge: Number(form.get("recipientAge")),
          rules: {
            likes: toList(form.get("likes")),
            avoid: toList(form.get("avoid")),
            intent: String(form.get("intent") ?? "").trim(),
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
      {props.noteMismatch && (
        <p className="rounded-xl border border-line bg-paper p-3">
          Your note and the form gave different numbers. We&apos;ll use what&apos;s below.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 font-medium">
          Budget in dollars
          <input
            name="budgetDollars"
            type="number"
            className="field"
            defaultValue={budgetDollars}
            min={1}
            max={500}
            required
          />
        </label>
        <label className="flex flex-col gap-1 font-medium">
          {recipientName}&apos;s age
          <input
            name="recipientAge"
            type="number"
            className="field"
            defaultValue={recipientAge}
            min={1}
            max={17}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 font-medium">
        {recipientName} likes
        <input name="likes" className="field" defaultValue={rules.likes.join(", ")} />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Avoid
        <input name="avoid" className="field" defaultValue={rules.avoid.join(", ")} />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        What this gift is for
        <textarea name="intent" className="field" rows={2} defaultValue={rules.intent} />
      </label>
      {error && (
        <p role="alert" className="text-berry">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={busy}>
        {busy ? "Opening PayPal..." : "Save with PayPal"}
      </button>
      <p className="text-center text-sm text-soft">
        You&apos;re charged $0 now. PayPal charges you once, only after a parent approves.
      </p>
    </form>
  );
}
