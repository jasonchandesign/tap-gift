"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  giftId: string;
  recipientName: string;
  paid: string;
};

export function CancelGift({ giftId, recipientName, paid }: Props) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/gifts/${giftId}/cancel`, { method: "POST" }).catch(
      () => null,
    );
    // A 409 means the gift was chosen first, and the refreshed page will show that.
    if (response?.ok || response?.status === 409) {
      router.refresh();
      return;
    }
    setError("That didn't work. Please try again.");
    setBusy(false);
  }

  if (!asking) {
    return (
      <button type="button" className="button-quiet mt-8 w-full" onClick={() => setAsking(true)}>
        Cancel and refund {paid}
      </button>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-line bg-paper p-5">
      <p>Cancel this gift? {recipientName} won&apos;t be able to open it.</p>
      {error && (
        <p role="alert" className="mt-2 text-berry">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="button" disabled={busy} onClick={cancel}>
          {busy ? "Canceling..." : `Yes, refund ${paid}`}
        </button>
        <button
          type="button"
          className="button-quiet"
          disabled={busy}
          onClick={() => setAsking(false)}
        >
          Keep the gift
        </button>
      </div>
    </section>
  );
}
