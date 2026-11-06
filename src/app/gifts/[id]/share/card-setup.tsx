"use client";

import { useState, type FormEvent } from "react";

export function CardSetup({ giftId }: { giftId: string }) {
  const [cardUrl, setCardUrl] = useState("");
  const [relinked, setRelinked] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function link(existingCardUrl?: string) {
    setError("");
    const response = await fetch(`/api/gifts/${giftId}/card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ existingCardUrl }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setCardUrl(data.cardUrl);
    setRelinked(Boolean(existingCardUrl));
  }

  function relink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void link(String(form.get("existingCardUrl") ?? ""));
  }

  async function copy() {
    await navigator.clipboard.writeText(cardUrl);
    setCopied(true);
  }

  return (
    <section className="mt-4 rounded-2xl border border-line bg-paper p-5">
      <h2 className="text-xl font-semibold">Use an NFC card</h2>
      <p className="mt-1 text-soft">The kid taps a physical card to open the same gift.</p>

      {!cardUrl && (
        <div className="mt-4 flex flex-col gap-4">
          <button type="button" className="button-quiet" onClick={() => link()}>
            Link a new card
          </button>
          <details>
            <summary className="cursor-pointer text-sm text-soft underline">
              Reusing a card?
            </summary>
            <form onSubmit={relink} className="mt-3 flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Paste its link
                <input name="existingCardUrl" className="field" required />
              </label>
              <button type="submit" className="button-quiet">
                Point this card at the gift
              </button>
            </form>
          </details>
        </div>
      )}

      {cardUrl && relinked && (
        <p className="mt-4 text-pine">Card linked. It opens this gift now, with no rewriting.</p>
      )}

      {cardUrl && !relinked && (
        <div className="mt-4">
          <p className="font-medium">Your card&apos;s link</p>
          <p className="mt-1 break-all rounded-xl bg-cream p-3 font-mono text-sm">{cardUrl}</p>
          <button type="button" className="button-quiet mt-2 w-full" onClick={copy}>
            {copied ? "Link copied" : "Copy card link"}
          </button>
          <ol className="mt-4 list-decimal space-y-1 pl-5">
            <li>Install the free NFC Tools app.</li>
            <li>Tap Write, then Add a record, then URL/URI.</li>
            <li>Paste the link and tap OK.</li>
            <li>Tap Write and hold the card to the top of your phone.</li>
            <li>Tap the card with the app closed to test it.</li>
          </ol>
          <p className="mt-3 text-sm text-soft">
            The card must be writable. Locked or amiibo cards won&apos;t work. Don&apos;t use
            Lock tag in the app, because locking is permanent and you can reuse this card next
            holiday. Tested on iPhone; Android phones should open the link too.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-berry">
          {error}
        </p>
      )}
    </section>
  );
}
