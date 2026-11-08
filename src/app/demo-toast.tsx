"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = { children: React.ReactNode; action: string; href: string };

/**
 * Notes for people trying the demo, kept visibly apart from the gift itself. They slide down over
 * the wrapping paper at the top, where they cover nothing to tap, and fold away to one faint row.
 * They're plain white and gray rather than a skin's colors, so they stand out on every paper.
 * The button opens the kid's side in a new tab. Coming back to this tab shows what the kid did.
 */
export function DemoToast({ children, action, href }: Props) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [router]);

  return (
    <aside
      aria-label="Demo notes"
      className="demo-toast fixed inset-x-0 top-0 z-40 mx-auto w-full max-w-xl px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div
        className={`rounded-2xl bg-white text-left text-slate-800 shadow-2xl ring-1 ring-black/10 transition-opacity duration-300 ${
          open ? "" : "opacity-70 hover:opacity-95"
        }`}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls="demo-notes"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-3 px-5 py-3"
        >
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
            Demo notes
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`size-5 text-slate-500 transition-transform duration-300 ${open ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 15l6-6 6 6" />
          </svg>
          <span className="sr-only">{open ? "Hide demo notes" : "Show demo notes"}</span>
        </button>
        <div
          id="demo-notes"
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden" inert={!open}>
            <div className="px-5 pb-5">
              <p className="text-[0.95rem] leading-snug text-slate-700">{children}</p>
              <a
                href={href}
                target="_blank"
                rel="noopener"
                className="mt-4 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 font-bold text-white transition-transform hover:bg-slate-700 active:scale-[0.97]"
              >
                {action}
              </a>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
