"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function NewGiftForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giverName: form.get("giverName"),
          recipientName: form.get("recipientName"),
          recipientAge: Number(form.get("recipientAge")),
          budgetDollars: Number(form.get("budgetDollars")),
          note: form.get("note"),
          parentContact: form.get("parentContact"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/gifts/${data.id}/confirm${data.mismatch ? "?check=1" : ""}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 font-medium">
        Your name
        <input name="giverName" className="field" defaultValue="Grandma" required maxLength={60} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 font-medium">
          Kid&apos;s first name
          <input name="recipientName" className="field" defaultValue="Mia" required maxLength={60} />
        </label>
        <label className="flex flex-col gap-1 font-medium">
          Age
          <input
            name="recipientAge"
            type="number"
            className="field"
            defaultValue={9}
            min={1}
            max={17}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 font-medium">
        Budget in dollars
        <input
          name="budgetDollars"
          type="number"
          className="field"
          defaultValue={50}
          min={1}
          max={500}
          required
        />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Your note
        <textarea
          name="note"
          className="field"
          rows={4}
          required
          maxLength={1000}
          defaultValue="$50 for Mia, she's 9, loves art and animals, nothing with screens"
        />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Parent&apos;s phone or email
        <input
          name="parentContact"
          className="field"
          defaultValue="parent@example.com"
          required
          maxLength={120}
        />
      </label>
      {error && (
        <p role="alert" className="text-berry">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={busy}>
        {busy ? "Reading your note..." : "Continue"}
      </button>
    </form>
  );
}
