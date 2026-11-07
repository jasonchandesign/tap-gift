"use client";

import Link from "next/link";
import type { ShownOption } from "@/lib/chat";
import { formatDollars, variantSummary } from "@/lib/gifts-format";

type Props = {
  giftId: string;
  recipientName: string;
  cart: ShownOption[];
  error: string;
  onRemove: (option: ShownOption) => void;
  onBack: () => void;
};

export function CartView({ giftId, recipientName, cart, error, onRemove, onBack }: Props) {
  const prices = cart.map((item) => item.price_cents);
  const total = cart.length ? formatDollars(Math.max(...prices)) : "";

  return (
    <section className="fixed inset-0 z-20 flex flex-col bg-page">
      <header className="flex items-center gap-1 border-b border-line px-2 py-2">
        <button type="button" className="icon-button text-action" aria-label="Back to chat" onClick={onBack}>
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Your cart</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-4">
        {cart.length === 0 ? (
          <p className="mt-10 text-center text-soft">
            Nothing here yet. Add a few gifts for {recipientName} from the chat.
          </p>
        ) : (
          <ul>
            {cart.map((item) => {
              const details = [
                ...Object.values(item.variant_choice_json).map((value) => `Size ${value}`),
                variantSummary(item.variants_json),
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <li key={item.id} className="flex items-center gap-3 border-b border-line py-3">
                  {/* Images come from many stores, so next/image can't list their hosts. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-18 shrink-0 rounded-xl border border-line bg-white object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 font-sans font-bold leading-snug tracking-normal">
                      {item.title}
                    </h2>
                    <p className="text-sm tabular-nums text-soft">{formatDollars(item.price_cents)}</p>
                    {details && <p className="text-sm text-soft">{details}</p>}
                  </div>
                  <button type="button" className="chip" onClick={() => onRemove(item)}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {cart.length > 0 && (
        <div className="mx-auto w-full max-w-2xl border-t border-line px-4 pb-4 pt-3">
          {error && (
            <p className="mb-2 text-sm text-alert" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>You pay</span>
            <span className="tabular-nums">{total}</span>
          </div>
          {cart.length > 1 && (
            <p className="mt-1 text-sm text-soft">
              That&apos;s the priciest gift. {recipientName} picks one, and any difference comes back
              to you.
            </p>
          )}
          <Link href={`/gifts/${giftId}/confirm`} className="button mt-3 w-full">
            Check out
          </Link>
        </div>
      )}
    </section>
  );
}
