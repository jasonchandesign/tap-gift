"use client";

import { useState } from "react";

type Props = { url: string; message: string };

export function SendCard({ url, message }: Props) {
  const [copied, setCopied] = useState(false);
  const body = encodeURIComponent(message);

  async function share() {
    if (navigator.share) {
      await navigator.share({ text: message }).catch(() => undefined);
    } else {
      await copy();
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-paper p-5">
      <h2 className="text-xl font-semibold">Send a virtual card</h2>
      <p className="mt-1 text-soft">Text or email this link.</p>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" className="button" onClick={share}>
          Share the card
        </button>
        <div className="grid grid-cols-3 gap-2">
          <a className="button-quiet" href={`sms:?&body=${body}`}>
            Text
          </a>
          <a
            className="button-quiet"
            href={`mailto:?subject=${encodeURIComponent("A gift is waiting")}&body=${body}`}
          >
            Email
          </a>
          <button type="button" className="button-quiet" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <a className="mt-1 text-center text-sm text-soft underline" href={url}>
          Open as the kid
        </a>
      </div>
    </section>
  );
}
