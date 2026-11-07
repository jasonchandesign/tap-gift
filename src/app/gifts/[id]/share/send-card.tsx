"use client";

import { useState, useSyncExternalStore } from "react";

type Props = { url: string; shareText: string; emailSubject: string; emailBody: string };

function noUpdates() {
  return () => undefined;
}

const ICON = {
  className: "size-5.5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function SendCard({ url, shareText, emailSubject, emailBody }: Props) {
  const [copied, setCopied] = useState(false);
  // A phone gets its share sheet. A computer gets email, since texting from one is rare.
  // Null until the browser answers, so neither button flashes up first.
  const phone = useSyncExternalStore(
    noUpdates,
    () => !!navigator.share && matchMedia("(pointer: coarse)").matches,
    () => null,
  );

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5">
      {phone === null ? (
        <span className="button invisible" aria-hidden="true">
          Share the gift
        </span>
      ) : phone ? (
        <button
          type="button"
          className="button"
          onClick={() => navigator.share({ text: shareText }).catch(() => undefined)}
        >
          Share the gift
        </button>
      ) : (
        <a
          className="button"
          href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
        >
          Email the gift
        </a>
      )}
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="gift-link">
          Gift link
        </label>
        <input
          id="gift-link"
          className="field min-w-0 flex-1 text-soft"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          className="icon-button text-action"
          aria-label={copied ? "Link copied" : "Copy link"}
          onClick={copy}
        >
          {copied ? (
            <svg {...ICON}>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          ) : (
            <svg {...ICON}>
              <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
              <path d="M15.5 5.5v-1a2 2 0 0 0-2-2h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1" />
            </svg>
          )}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? "Link copied" : ""}
      </p>
    </section>
  );
}
