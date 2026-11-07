"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { useRouter } from "next/navigation";
import { Confetti } from "../../confetti";
import { Bow, GiftTag, TagString } from "../../gift-wrap";
import { MoreText } from "../../more-text";
import { Arrows } from "../../arrows";
import { Gallery } from "../../gallery";
import { cutLength, MIN_CUT_PX, tearAcross, tearAlong, type Half, type Point } from "./tear";

export type KidOption = {
  id: string;
  title: string;
  imageUrl: string;
  images: string[];
  ageLabel: string;
  description: string;
  summary: string;
  size: string;
  variants: { name: string; values: string[]; images?: Record<string, string> }[];
  wrapImage: string;
  wrapSize: string;
};

export type KidChosen = {
  title: string;
  imageUrl: string;
  details: string;
  thankYou: string | null;
};

type Props = {
  token: string;
  giverName: string;
  recipientName: string;
  note: string;
  cardId: string | null;
  options: KidOption[];
  chosen: KidChosen | null;
};

const RIP_MS = 900;
const STORE_MS = 550;

function GiftPicture({ option }: { option: { imageUrl: string } }) {
  return (
    // Images come from many stores, so next/image can't list their hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={option.imageUrl}
      alt=""
      referrerPolicy="no-referrer"
      className="aspect-square w-full rounded-2xl bg-white object-contain"
    />
  );
}

/** Asks first, because clearing takes this gift off the card. */
function ReuseCard({ token, cardId }: { token: string; cardId: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function clear() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/g/${token}/clear-card`, { method: "POST" }).catch(() => null);
    if (response?.ok) {
      router.push(`/new?card=${cardId}`);
      return;
    }
    setError("That didn't work. Please try again.");
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        className="mt-6 text-sm text-soft underline"
        onClick={() => dialog.current?.showModal()}
      >
        Give another gift with this card
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="reuse-title"
        className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-3xl bg-paper p-7 text-center text-ink backdrop:bg-black/50"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <h2 id="reuse-title" className="text-2xl font-semibold">
          Clear this card?
        </h2>
        <p className="mt-3 text-soft">
          Your order has already been placed. Clearing this card will not cancel the order.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-alert">
            {error}
          </p>
        )}
        <button type="button" className="button mt-6 w-full" disabled={busy} onClick={clear}>
          {busy ? "Clearing..." : "Clear and start new gift"}
        </button>
        <button
          type="button"
          className="button-quiet mt-2 w-full"
          onClick={() => dialog.current?.close()}
        >
          Keep the order on this card
        </button>
      </dialog>
    </>
  );
}

function Done({
  token,
  giverName,
  cardId,
  chosen,
}: Pick<Props, "token" | "giverName" | "cardId"> & { chosen: KidChosen }) {
  const [sent, setSent] = useState(!!chosen.thankYou);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const note = new FormData(event.currentTarget).get("note");
    const response = await fetch(`/api/g/${token}/thank-you`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }).catch(() => null);
    if (response?.ok) setSent(true);
    else setError("That didn't save. Please try again.");
  }

  return (
    <section className="reveal-in w-full max-w-md rounded-3xl border border-line bg-paper p-8 text-center">
      {!chosen.thankYou && <Confetti />}
      <h1 className="text-4xl font-semibold">Your order has been confirmed</h1>
      <div className="mx-auto mt-5 w-56">
        <GiftPicture option={chosen} />
      </div>
      <p className="mt-4 text-xl font-semibold">{chosen.title}</p>
      {chosen.details && <p className="text-soft">{chosen.details}</p>}
      {sent ? (
        <p className="mt-6 text-lg text-accent">We saved your thank-you for {giverName}.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 text-left">
          <label className="flex flex-col gap-1 font-medium">
            Say thank you to {giverName}
            <textarea name="note" className="field text-lg" rows={3} required maxLength={500} />
          </label>
          <p className="-mt-1 text-sm text-soft">
            Demo only: this isn&apos;t emailed. The real app would send it to {giverName}&apos;s PayPal
            email.
          </p>
          {error && (
            <p role="alert" className="text-alert">
              {error}
            </p>
          )}
          <button type="submit" className="button">
            Save thank you
          </button>
        </form>
      )}
      {cardId && <ReuseCard token={token} cardId={cardId} />}
    </section>
  );
}

/** Follows a finger (or mouse) across the paper. Letting go after a long enough cut tears along it. */
function useCut(onTear?: (path: Point[]) => void) {
  const [trail, setTrail] = useState<Point[]>([]);
  // Only the finger that started the cut counts, so a second finger can't bend it.
  const drag = useRef<{ pointer: number; points: Point[] } | null>(null);

  function stop() {
    drag.current = null;
    setTrail([]);
  }

  return {
    trail,
    handlers: onTear && {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if ((event.target as HTMLElement).closest("button")) return;
        // Keeps the cut going if the finger slides off the edge.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Not every pointer can be captured, and the cut works without it.
        }
        if (drag.current) return;
        drag.current = { pointer: event.pointerId, points: [{ x: event.clientX, y: event.clientY }] };
        setTrail(drag.current.points);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = drag.current;
        if (current?.pointer !== event.pointerId) return;
        const last = current.points[current.points.length - 1];
        if (Math.hypot(event.clientX - last.x, event.clientY - last.y) < 3) return;
        current.points = [...current.points, { x: event.clientX, y: event.clientY }];
        setTrail(current.points);
      },
      onPointerUp(event: PointerEvent<HTMLElement>) {
        if (drag.current?.pointer !== event.pointerId) return;
        const { points } = drag.current;
        stop();
        if (cutLength(points) >= MIN_CUT_PX) {
          navigator.vibrate?.(20);
          onTear(points);
        }
      },
      onPointerCancel(event: PointerEvent<HTMLElement>) {
        if (drag.current?.pointer === event.pointerId) stop();
      },
    },
  };
}

function Wrapped({
  option,
  recipientName,
  giverName,
  left,
  arriving = false,
  tagBack,
  flipped = false,
  onFlip,
  holding = false,
  onUnwrap,
}: {
  option: KidOption;
  recipientName: string;
  giverName: string;
  left: number;
  /** The intro written on the back of the tag. */
  tagBack?: ReactNode;
  flipped?: boolean;
  onFlip?: () => void;
  /** Keep the unwrap button hidden while the intro is showing. */
  holding?: boolean;
  /** Slide up from the bottom, as the next gift after one is put away. */
  arriving?: boolean;
  onUnwrap?: (path?: Point[]) => void;
}) {
  const paper = {
    "--wrap-pattern": option.wrapImage,
    "--wrap-pattern-size": option.wrapSize,
  } as CSSProperties;
  const { trail, handlers } = useCut(onUnwrap);
  const swing = useRef<HTMLDivElement>(null);
  const turned = useRef(flipped);

  // Turning the tag over sets it swinging on its string, and it settles back down.
  useEffect(() => {
    if (turned.current === flipped) return;
    turned.current = flipped;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Each swing eases out at its peak like a pendulum, smaller each time.
    swing.current?.animate(
      [0, 2.2, -1.5, 0.9, -0.45, 0.15, 0].map((degrees) => ({
        transform: `rotate(${degrees}deg)`,
        easing: "cubic-bezier(0.37, 0, 0.63, 1)",
      })),
      { duration: 2600 },
    );
  }, [flipped]);

  return (
    <section
      className={`wrap-paper fixed inset-0 flex touch-none select-none flex-col items-center overflow-y-auto px-6 pb-8 pt-8 ${arriving ? "slide-in-up" : ""}`}
      style={paper}
      {...handlers}
    >
      {trail.length > 1 && (
        <svg className="pointer-events-none fixed inset-0 z-10 size-full" aria-hidden="true">
          {[
            { stroke: "rgb(0 0 0 / 0.3)", width: 6 },
            { stroke: "white", width: 2.5 },
          ].map(({ stroke, width }) => (
            <polyline
              key={stroke}
              points={trail.map(({ x, y }) => `${x},${y}`).join(" ")}
              fill="none"
              stroke={stroke}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      )}
      <Bow className="relative w-44 shrink-0" />
      {/* The tag hangs from a string tied to the bow, swaying from the knot. */}
      <div className="tag-sway relative -mt-8 flex w-full shrink-0 flex-col items-center">
        <div ref={swing} className="tag-swing flex w-full flex-col items-center">
          <TagString className="relative h-20 shrink-0" />
          <div className="relative -mt-3 flex w-full justify-center">
            <GiftTag recipientName={recipientName} giverName={giverName} back={tagBack} flipped={flipped} onFlip={onFlip} />
          </div>
        </div>
      </div>
      <div className="min-h-6 flex-1" />
      <div
        className={`relative flex w-full max-w-md flex-col items-center gap-3 ${holding ? "invisible" : arriving || tagBack ? "rise-in" : ""}`}
      >
        <button
          type="button"
          className="button w-full text-lg"
          tabIndex={onUnwrap ? 0 : -1}
          onClick={() => onUnwrap?.()}
        >
          Unwrap Gift ({left} left)
        </button>
        <p className="rounded-lg bg-action/80 px-3 py-0.5 text-sm font-semibold text-paper">
          or swipe across the paper to rip it
        </p>
      </div>
    </section>
  );
}

const GIFT_ICON = (
  <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C10 3 7 4 8 6s4 1 4 1zM12 7c2-4 5-3 4-1s-4 1-4 1z" />
  </svg>
);

const HEART_ICON = (
  <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);

function IntroStep({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-left">
      <span className="shrink-0 text-action">{icon}</span>
      <span className="font-display text-xl">{children}</span>
    </li>
  );
}

/** The back of the first tag: unwrap them all, then keep one. */
function TagIntro({ count, start, label }: { count: number; start: Ref<HTMLButtonElement>; label: string }) {
  return (
    <>
      <h2 className="text-2xl font-semibold leading-tight">You have {count} surprises!</h2>
      <ol className="mx-auto mt-4 flex w-fit flex-col gap-2.5">
        <IntroStep icon={GIFT_ICON}>{count === 2 ? "Unwrap both" : `Unwrap all ${count}`}</IntroStep>
        <IntroStep icon={HEART_ICON}>Pick 1 to keep</IntroStep>
      </ol>
      {/* The tag itself turns over when this is tapped. */}
      <button ref={start} type="button" className="button mt-5 w-full">
        {label}
      </button>
    </>
  );
}

/** Rows of chips shown before the rest fold behind a "more" button. */
const CHIP_ROWS = 3;
const MORE_WIDTH = 48;
const CHIP_GAP = 8;

type Fold = { height: number; hideFrom: number; left: number; top: number };

/**
 * Chips that wrap onto as many rows as they need, folded to three rows with a "more" button at the
 * end of the third. Every chip stays in the layout so the rows can always be measured; the ones past
 * the fold are clipped or hidden.
 */
function ChipRows({ label, selected, children }: { label: string; selected: number; children: ReactNode[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [fold, setFold] = useState<Fold | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      // Folded chips sit inside a wrapper, so find every chip, not just direct children.
      const chips = [...element.querySelectorAll<HTMLElement>("button:not([data-more])")];
      const tops = [...new Set(chips.map((chip) => chip.offsetTop))].sort((a, b) => a - b);
      let next: Fold | null = null;
      if (tops.length > CHIP_ROWS) {
        const lastTop = tops[CHIP_ROWS - 1];
        const row = chips.filter((chip) => chip.offsetTop === lastTop);
        const first = chips.indexOf(row[0]);
        // Drop chips from the end of the third row until the button fits after them.
        let keep = row.length;
        while (keep > 0 && row[keep - 1].offsetLeft + row[keep - 1].offsetWidth + CHIP_GAP + MORE_WIDTH > element.clientWidth) keep--;
        const before = keep > 0 ? row[keep - 1] : null;
        next = {
          height: Math.max(...row.map((chip) => chip.offsetTop + chip.offsetHeight)) + 2,
          hideFrom: first + keep,
          left: before ? before.offsetLeft + before.offsetWidth + CHIP_GAP : row[0].offsetLeft,
          top: lastTop,
        };
      }
      setFold((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children.length]);

  // A choice already made past the fold stays in view.
  const folded = fold && !expanded && selected < fold.hideFrom ? fold : null;

  return (
    <div
      ref={box}
      className="relative -m-0.5 mt-1.5 flex flex-wrap gap-2 overflow-hidden p-0.5"
      style={folded ? { maxHeight: folded.height } : undefined}
    >
      {children.map((child, at) =>
        folded && at >= folded.hideFrom ? (
          <span key={at} className="contents [&>*]:invisible" aria-hidden="true" inert>
            {child}
          </span>
        ) : (
          child
        ),
      )}
      {folded && (
        <button
          type="button"
          data-more=""
          className="chip absolute"
          style={{ left: folded.left, top: folded.top, width: MORE_WIDTH }}
          aria-label={`Show all ${children.length} ${label}`}
          aria-expanded={false}
          onClick={() => setExpanded(true)}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      )}
    </div>
  );
}

function VariantPicker({
  option,
  choice,
  onPick,
}: {
  option: KidOption;
  choice: Record<string, string>;
  onPick: (group: string, value: string) => void;
}) {
  return option.variants.map((group) => (
    <fieldset key={group.name} className="mt-4">
      <legend className="text-lg font-semibold">Pick your {group.name.toLowerCase()}</legend>
      <ChipRows label={`${group.name.toLowerCase()} choices`} selected={group.values.indexOf(choice[group.name])}>
        {group.values.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip gap-2 ${group.images?.[value] ? "py-1 pl-1" : ""} ${choice[group.name] === value ? "ring-2 ring-action" : ""}`}
            aria-pressed={choice[group.name] === value}
            onClick={() => onPick(group.name, value)}
          >
            {group.images?.[value] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.images[value]}
                alt=""
                referrerPolicy="no-referrer"
                className="size-8 rounded-full bg-white object-cover"
              />
            )}
            {value}
          </button>
        ))}
      </ChipRows>
    </fieldset>
  ));
}

/** The gifts in one row that runs off the screen's edges, with arrows for a mouse. */
function GiftRow({ children }: { children: ReactNode }) {
  const row = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ back: false, next: false });

  function update() {
    const element = row.current;
    if (!element) return;
    const { scrollLeft, scrollWidth, clientWidth } = element;
    setEnds({ back: scrollLeft > 4, next: scrollLeft + clientWidth < scrollWidth - 4 });
  }

  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function move(way: 1 | -1) {
    const element = row.current;
    element?.scrollBy({ left: way * element.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className="relative mt-5">
      <Arrows
        label="gift"
        canBack={ends.back}
        canNext={ends.next}
        onBack={() => move(-1)}
        onNext={() => move(1)}
      />
      <ul
        ref={row}
        onScroll={update}
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 pt-1"
      >
        {children}
      </ul>
    </div>
  );
}

function Basket({ count }: { count: number }) {
  return (
    <div
      className="fixed right-4 top-4 z-30 flex size-12 items-center justify-center rounded-full bg-paper text-ink shadow-lg"
      role="img"
      aria-label={`${count} ${count === 1 ? "gift" : "gifts"} in your basket`}
    >
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10h18l-2 10H5L3 10zM7.5 10l4-6M16.5 10l-4-6M9.5 14v2.5M14.5 14v2.5" />
      </svg>
      {count > 0 && (
        <span
          key={count}
          className="reveal-in absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-paper ring-2 ring-paper"
        >
          {count}
        </span>
      )}
    </div>
  );
}

export function Reveal({ token, giverName, recipientName, note, cardId, options, chosen }: Props) {
  const [stage, setStage] = useState<"wrapped" | "ripping" | "opened" | "storing" | "review">(
    "wrapped",
  );
  const [intro, setIntro] = useState(options.length > 1);
  // The first tag turns over to show how it works, then back when the child is ready.
  const [flipped, setFlipped] = useState(false);
  const start = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!intro) return;
    const timer = setTimeout(() => setFlipped(true), 700);
    return () => clearTimeout(timer);
  }, [intro]);

  useEffect(() => {
    if (flipped) start.current?.focus({ preventScroll: true });
  }, [flipped]);
  const [halves, setHalves] = useState<Half[]>([]);
  const [remaining, setRemaining] = useState(options);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(options.length === 1 ? options[0].id : "");
  // Colors and styles picked so far, by gift.
  const [choices, setChoices] = useState<Record<string, Record<string, string>>>({});
  const [done, setDone] = useState(chosen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (done) return <Done token={token} giverName={giverName} cardId={cardId} chosen={done} />;

  const selectedOption = remaining.find(({ id }) => id === selected);

  const choice = choices[selected] ?? {};

  function pick(optionId: string, group: string, value: string) {
    setChoices((current) => ({ ...current, [optionId]: { ...current[optionId], [group]: value } }));
  }

  /** The photo of the color or style picked so far, or the main photo. */
  function pictureOf(option: KidOption) {
    const picked = choices[option.id] ?? {};
    return option.variants.map((group) => group.images?.[picked[group.name]]).find(Boolean) ?? option.imageUrl;
  }

  /** A gift's photos, with the picked color's photo first. */
  function photosFor(option: KidOption) {
    const first = pictureOf(option);
    return first === option.imageUrl ? option.images : [first, ...option.images.filter((url) => url !== first)];
  }
  const ready = !!selectedOption?.variants.every(({ name }) => choice[name]);

  function unwrap(path?: Point[]) {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { innerWidth: width, innerHeight: height } = window;
    setHalves(path ? tearAlong(path, width, height) : tearAcross(width, height));
    setStage("ripping");
    setTimeout(() => setStage("opened"), still ? 0 : RIP_MS);
  }

  function storeGift() {
    const last = index === options.length - 1;
    setStage("storing");
    setTimeout(() => {
      if (last) {
        setStage("review");
      } else {
        setIndex(index + 1);
        setStage("wrapped");
      }
    }, STORE_MS);
  }

  function select(id: string) {
    setSelected(id);
  }

  async function send() {
    const option = selectedOption;
    if (!option) return;
    setBusy(true);
    setError("");

    const response = await fetch(`/api/g/${token}/choose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: option.id, choice }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);

    if (response?.ok) {
      const details = [...Object.values(choice), option.size].filter(Boolean).join(", ");
      setDone({ ...option, imageUrl: pictureOf(option), details, thankYou: null });
      return;
    }
    if (data?.result === "unavailable") {
      setRemaining((current) => current.filter(({ id }) => id !== option.id));
      select("");
    }
    setError(data?.error ?? "That didn't go through. Please try again.");
    setBusy(false);
  }

  if (stage !== "review") {
    const option = options[index];
    const left = options.length - index;
    const more = left - 1;

    return (
      <>
        {stage === "wrapped" ? (
          <Wrapped
            option={option}
            recipientName={recipientName}
            giverName={giverName}
            left={left}
            arriving={index > 0}
            tagBack={
              options.length > 1 ? (
                <TagIntro count={options.length} start={start} label={intro ? "Get started" : "Got it"} />
              ) : undefined
            }
            onFlip={
              options.length > 1
                ? () => {
                    setFlipped((turned) => !turned);
                    setIntro(false);
                  }
                : undefined
            }
            flipped={flipped}
            holding={intro}
            onUnwrap={intro || flipped ? undefined : unwrap}
          />
        ) : (
          <section className="fixed inset-0 flex flex-col bg-page">
            {stage === "opened" && <Confetti key={option.id} />}
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              <div className={stage === "storing" ? "to-basket" : ""}>
                {/* A new color starts the gallery over on its photo. */}
                <Gallery
                  key={pictureOf(option)}
                  images={photosFor(option)}
                  height="h-[50dvh] min-h-64 max-h-[34rem]"
                />
              </div>
              <div className={`mx-auto w-full max-w-md px-6 ${stage === "storing" ? "float-out" : ""}`}>
                <h1 className="mt-5 text-2xl font-semibold">{option.title}</h1>
                {(option.ageLabel || option.size) && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {option.ageLabel && <li className="chip">{option.ageLabel}</li>}
                    {option.size && <li className="chip">Size {option.size}</li>}
                  </ul>
                )}
                <VariantPicker
                  option={option}
                  choice={choices[option.id] ?? {}}
                  onPick={(group, value) => pick(option.id, group, value)}
                />
                {/* The picker above already shows the choices. */}
                {option.summary && option.variants.length === 0 && <p className="mt-2 font-medium">Comes in {option.summary}</p>}
                {option.description && <MoreText text={option.description} className="mt-2 text-soft" />}
              </div>
            </div>
            <div className={`mx-auto w-full max-w-md px-6 pb-6 pt-2 ${stage === "storing" ? "float-out" : ""}`}>
              <button
                type="button"
                className="button w-full text-lg"
                disabled={stage !== "opened"}
                onClick={storeGift}
              >
                {more > 0
                  ? `Next surprise (${more} left)`
                  : options.length === 1
                    ? "Review your gift"
                    : "Review all gifts"}
              </button>
            </div>
          </section>
        )}
        {stage === "ripping" && (
          <div aria-hidden="true">
            {halves.map((half) => (
              <div
                key={half.clip}
                className="rip"
                style={
                  {
                    "--rip-x": `${half.dx}px`,
                    "--rip-y": `${half.dy}px`,
                    "--rip-turn": `${half.rotate}deg`,
                    transformOrigin: half.origin,
                  } as CSSProperties
                }
              >
                <div className="fixed inset-0" style={{ clipPath: half.clip }}>
                  <Wrapped option={option} recipientName={recipientName} giverName={giverName} left={left} />
                </div>
              </div>
            ))}
          </div>
        )}
        <Basket count={index} />
      </>
    );
  }

  return (
    <section className="reveal-in w-full max-w-xl">
      <h1 className="text-center text-3xl font-semibold">
        {options.length === 1 ? "It's all yours!" : "Pick 1 to keep!"}
      </h1>
      {note && (
        <div className="mt-5 -rotate-1 rounded-2xl border border-line bg-paper p-5 shadow-md">
          <p className="text-sm text-soft">A note from {giverName}</p>
          <p className="mt-1 font-hand text-3xl leading-snug wrap-anywhere">{note}</p>
        </div>
      )}
      {remaining.length === 0 ? (
        <p className="mt-4 text-center text-soft">
          These all sold out. Ask {giverName} to pick something new.
        </p>
      ) : (
        // One row, so the choices sit right under it.
        <GiftRow>
          {remaining.map((option) => (
            <li key={option.id} className="w-[62%] max-w-60 shrink-0 snap-start">
              <button
                type="button"
                className={`h-full w-full rounded-2xl border bg-paper p-3 text-left ${selected === option.id ? "border-action ring-2 ring-action" : "border-line"}`}
                aria-pressed={selected === option.id}
                onClick={(event) => {
                  select(option.id);
                  event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }}
              >
                <GiftPicture option={{ imageUrl: pictureOf(option) }} />
                <span className="mt-2 block font-semibold">{option.title}</span>
                {option.summary && <span className="block text-sm text-soft">{option.summary}</span>}
              </button>
            </li>
          ))}
        </GiftRow>
      )}
      {selectedOption && (
        <VariantPicker
          option={selectedOption}
          choice={choice}
          onPick={(group, value) => pick(selectedOption.id, group, value)}
        />
      )}
      {error && (
        <p role="alert" className="mt-3 text-center text-alert">
          {error}
        </p>
      )}
      {remaining.length > 0 && (
        <button
          type="button"
          className="button mt-5 w-full text-lg"
          disabled={!ready || busy}
          onClick={send}
        >
          {busy ? "Sending..." : "Confirm selection"}
        </button>
      )}
    </section>
  );
}
