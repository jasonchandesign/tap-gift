"use client";

import { useState } from "react";

type Props = { url: string; message: string; parentContact: string };

export function SendCard({ url, message, parentContact }: Props) {
  const [copied, setCopied] = useState(false);
  const isEmail = parentContact.includes("@");
  const body = encodeURIComponent(message);
  const smsTo = isEmail ? "" : parentContact.replace(/[^\d+]/g, "");
  const mailTo = isEmail ? parentContact : "";

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
      <p className="mt-1 text-soft">Text or email this link to the parent.</p>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" className="button" onClick={share}>
          Share the card
        </button>
        <div className="grid grid-cols-2 gap-2">
          <a className="button-quiet" href={`sms:${smsTo}?&body=${body}`}>
            Text
          </a>
          <a
            className="button-quiet"
            href={`mailto:${mailTo}?subject=${encodeURIComponent("A gift is waiting")}&body=${body}`}
          >
            Email
          </a>
        </div>
        <button type="button" className="button-quiet" onClick={copy}>
          {copied ? "Link copied" : "Copy link"}
        </button>
        <a className="button-quiet" href={url}>
          Open as the kid
        </a>
      </div>
    </section>
  );
}
