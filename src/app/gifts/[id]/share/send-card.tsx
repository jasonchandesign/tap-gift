"use client";

import { useState, useSyncExternalStore } from "react";

type Props = { url: string; message: string };

function noUpdates() {
  return () => undefined;
}

export function SendCard({ url, message }: Props) {
  const [copied, setCopied] = useState(false);
  // Desktop browsers can have a share sheet too, but it only earns a button on a phone.
  const canShare = useSyncExternalStore(
    noUpdates,
    () => !!navigator.share && matchMedia("(pointer: coarse)").matches,
    () => false,
  );
  const body = encodeURIComponent(message);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <section className="mt-6 flex flex-col gap-2 rounded-2xl border border-line bg-paper p-5">
      {canShare && (
        <button
          type="button"
          className="button"
          onClick={() => navigator.share({ text: message }).catch(() => undefined)}
        >
          Share the gift
        </button>
      )}
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
    </section>
  );
}
