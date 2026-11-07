import type { ReactNode } from "react";

type Tag = {
  recipientName: string;
  /** Shown smaller under the name. */
  giverName?: string;
  /** The smaller version shown in the gifter's preview. */
  small?: boolean;
  /** What's written on the back, for a tag that flips over. */
  back?: ReactNode;
  flipped?: boolean;
  /** Tapping the tag turns it over. */
  onFlip?: () => void;
};

export function Bow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 104" aria-hidden="true" className={className}>
      <path className="bow-ribbon" d="M85 52C62 8 18 2 12 30c-5 24 42 32 73 22Z" />
      <path className="bow-ribbon" d="M85 52c23-44 67-50 73-22 5 24-42 32-73 22Z" />
      <path
        className="bow-knot"
        d="M85 52C66 30 40 24 28 32c16 2 36 12 57 20Zm0 0c19-22 45-28 57-20-16 2-36 12-57 20Z"
      />
      <path className="bow-ribbon" d="M85 56 60 102l17-7 8 9Zm0 0 25 46-17-7-8 9Z" />
      <ellipse className="bow-knot" cx="85" cy="53" rx="12" ry="11" />
    </svg>
  );
}

export function TagString({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 84" aria-hidden="true" className={className}>
      <path className="tag-string" d="M30 2c-14 22 16 38 0 80" />
    </svg>
  );
}

function nameSize(name: string, small: boolean) {
  if (name.length > 14) return small ? "text-xl" : "text-3xl";
  if (name.length > 7) return small ? "text-3xl" : "text-5xl";
  return small ? "text-4xl" : "text-7xl";
}

const HOLE = <span className="absolute left-1/2 top-3.5 size-4 -translate-x-1/2 rounded-full bg-action" />;

export function GiftTag({ recipientName, giverName, small = false, back, flipped = false, onFlip }: Tag) {
  const Name = small ? "p" : "h1";
  if (!small) {
    // Both sides sit in one grid cell, so the tag is as tall as the fuller side.
    return (
      // Any tap on the tag, the back's button included, turns it over.
      <div
        className={`tag-flip relative w-full max-w-[16.5rem] -rotate-2 ${onFlip ? "cursor-pointer" : ""}`}
        onClick={onFlip}
      >
        <div className={`tag-turn ${flipped ? "flipped" : ""}`}>
          <div
            className="tag-face flex flex-col rounded-2xl bg-paper px-5 pb-11 pt-10 text-center shadow-xl"
            inert={flipped}
          >
            {HOLE}
            {onFlip && back && (
              <button type="button" className="absolute inset-0 rounded-2xl" aria-label="Turn the tag over to see how it works" />
            )}
            <p className="font-hand text-3xl leading-none text-soft">To:</p>
            <Name
              className={`mt-1 font-display font-semibold leading-none tracking-tight wrap-anywhere text-ink ${nameSize(recipientName, false)}`}
            >
              {recipientName}
            </Name>
            {giverName && (
              <p className="mt-auto pt-6 font-hand text-2xl leading-tight text-soft">
                From:
                <span className="block wrap-anywhere text-ink">{giverName}</span>
              </p>
            )}
          </div>
          {back && (
            <div className="tag-face tag-back rounded-2xl bg-paper px-5 pb-6 pt-10 text-center shadow-xl" inert={!flipped}>
              {HOLE}
              {back}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      className="w-52 -rotate-2 rounded-2xl bg-paper px-3 py-3 text-center shadow-xl"
    >
      <p className="font-hand text-2xl leading-none text-soft">To:</p>
      <Name
        className={`mt-1 font-display font-semibold leading-none tracking-tight wrap-anywhere text-ink ${nameSize(recipientName, small)}`}
      >
        {recipientName}
      </Name>
    </div>
  );
}
