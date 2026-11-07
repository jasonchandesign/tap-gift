"use client";

/**
 * Back and next buttons over the sides of something that scrolls sideways. Phones can swipe, so
 * these only show with a mouse or trackpad unless `always` is set.
 */
export function Arrows({
  always = false,
  label,
  canBack,
  canNext,
  onBack,
  onNext,
}: {
  /** Show on phones too, for something too big to be sure of swiping. */
  always?: boolean;
  label: string;
  canBack: boolean;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const sides = [
    { show: canBack, onClick: onBack, name: `Previous ${label}`, place: "left-3", path: "M15 5l-7 7 7 7" },
    { show: canNext, onClick: onNext, name: `Next ${label}`, place: "right-3", path: "M9 5l7 7-7 7" },
  ];

  return sides.map(({ show, onClick, name, place, path }) => (
    <button
      key={name}
      type="button"
      aria-label={name}
      tabIndex={show ? 0 : -1}
      className={`absolute top-1/2 z-10 size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-ink shadow-md ring-1 ring-line ${always ? "flex" : "hidden pointer-fine:flex"} ${place} ${show ? "" : "invisible"}`}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </button>
  ));
}
