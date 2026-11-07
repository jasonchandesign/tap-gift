"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Confetti } from "../../confetti";
import { Bow, GiftTag, TagString } from "../../gift-wrap";
import { MoreText } from "../../more-text";
import { Photos } from "../../photos";

export type KidOption = {
  id: string;
  title: string;
  imageUrl: string;
  images: string[];
  ageLabel: string;
  description: string;
  summary: string;
  size: string;
  variants: { name: string; values: string[] }[];
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

const SURPRISES = ["A surprise", "Two surprises", "Three surprises", "Four surprises", "Five surprises"];
const RIP_MS = 900;
/** How far a finger must swing back the other way to count as a zigzag, in pixels. */
const SWING_PX = 18;

type Point = { x: number; y: number };

/**
 * The torn edge from top to bottom, as x and y percents. A finger's path sets its shape, squashed
 * or stretched to the full height. Without one it's random, so no two rips look the same.
 */
function tearEdge(path: Point[] = []) {
  const edge: Point[] = [];
  if (path.length > 2) {
    const step = Math.max(1, Math.floor(path.length / 24));
    const kept = path.filter((_, index) => index % step === 0);
    kept.forEach(({ x }, index) =>
      edge.push({ x: Math.min(85, Math.max(15, x)), y: (index / (kept.length - 1)) * 100 }),
    );
  } else {
    // A slow wander, with uneven jags on top of it.
    let y = 0;
    let drift = 0;
    let side = Math.random() < 0.5 ? -1 : 1;
    while (y < 100) {
      edge.push({ x: 50 + drift + side * (1 + Math.random() * 5), y });
      y += 2 + Math.random() * 6;
      drift = Math.max(-12, Math.min(12, drift + (Math.random() - 0.5) * 6));
      side = Math.random() < 0.75 ? -side : side;
    }
    edge.push({ x: 50 + drift, y: 100 });
  }
  // Small jags between the big ones, like paper fibers.
  return edge.flatMap((point, index) => {
    const next = edge[index + 1];
    if (!next) return [point];
    const jag = { x: (point.x + next.x) / 2 + (Math.random() - 0.5) * 3, y: (point.y + next.y) / 2 };
    return [point, jag];
  });
}

function tearClip(edge: Point[], side: "left" | "right") {
  const outer = side === "left" ? 0 : 100;
  const points = edge.map(({ x, y }) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(", ");
  return `polygon(${outer}% 0, ${points}, ${outer}% 100%)`;
}
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
      <h1 className="text-4xl font-semibold">It&apos;s on its way!</h1>
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
      {cardId && (
        <a className="mt-6 block text-sm text-soft underline" href={`/new?card=${cardId}`}>
          Give another gift with this card
        </a>
      )}
    </section>
  );
}

/**
 * Follows a finger (or mouse) across the paper. Enough zigzags, or a long enough drag, tears it
 * open along that path.
 */
function useZigzag(onTear?: (path: Point[]) => void) {
  const [trail, setTrail] = useState<Point[]>([]);
  const drag = useRef<{ points: Point[]; turns: number; heading: number; far: number } | null>(null);

  function percent(event: PointerEvent) {
    return { x: (event.clientX / window.innerWidth) * 100, y: (event.clientY / window.innerHeight) * 100 };
  }

  function stop() {
    drag.current = null;
    setTrail([]);
  }

  return {
    trail,
    handlers: onTear && {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if ((event.target as HTMLElement).closest("button")) return;
        // Keeps the drag going if the finger slides off the edge.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Not every pointer can be captured, and the drag works without it.
        }
        drag.current = { points: [percent(event)], turns: 0, heading: 0, far: event.clientX };
        setTrail(drag.current.points);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = drag.current;
        if (!current) return;
        const point = percent(event);
        const last = current.points[current.points.length - 1];
        if (Math.hypot(point.x - last.x, point.y - last.y) < 1.5) return;
        current.points = [...current.points, point];

        // A turn is a swing back of at least SWING_PX from the farthest point the other way.
        const x = event.clientX;
        const way = Math.sign(x - current.far);
        if (current.heading === 0) {
          if (Math.abs(x - current.far) > SWING_PX) {
            current.heading = way;
            current.far = x;
          }
        } else if (way === current.heading) {
          current.far = x;
        } else if (Math.abs(x - current.far) > SWING_PX) {
          current.turns += 1;
          current.heading = way;
          current.far = x;
          navigator.vibrate?.(15);
        }

        const ys = current.points.map(({ y }) => y);
        const span = Math.max(...ys) - Math.min(...ys);
        if (current.turns >= 4 || (current.turns >= 2 && span > 25) || span > 55) {
          stop();
          onTear(current.points);
        } else {
          setTrail(current.points);
        }
      },
      onPointerUp: stop,
      onPointerCancel: stop,
    },
  };
}

function Wrapped({
  option,
  recipientName,
  left,
  onUnwrap,
}: {
  option: KidOption;
  recipientName: string;
  left: number;
  onUnwrap?: (path?: Point[]) => void;
}) {
  const paper = {
    "--wrap-pattern": option.wrapImage,
    "--wrap-pattern-size": option.wrapSize,
  } as CSSProperties;
  const { trail, handlers } = useZigzag(onUnwrap);

  return (
    <section
      className="wrap-paper fixed inset-0 flex touch-none select-none flex-col items-center overflow-y-auto px-6 pb-8 pt-8"
      style={paper}
      {...handlers}
    >
      {trail.length > 1 && (
        <svg className="pointer-events-none fixed inset-0 z-10 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={trail.map(({ x, y }) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0.1 9"
            vectorEffect="non-scaling-stroke"
            opacity="0.9"
          />
        </svg>
      )}
      <Bow className="relative w-44 shrink-0" />
      <TagString className="relative -mt-8 h-20 shrink-0" />
      <div className="present-wiggle relative -mt-3 flex w-full shrink-0 justify-center">
        <GiftTag recipientName={recipientName} />
      </div>
      <div className="min-h-6 flex-1" />
      <div className="relative flex w-full max-w-md flex-col items-center gap-3">
        <p className="rounded-lg bg-action px-3 py-0.5 font-display text-xl text-paper">
          {SURPRISES[left - 1]} inside
        </p>
        <button
          type="button"
          className="button button-paper w-full text-lg"
          tabIndex={onUnwrap ? 0 : -1}
          onClick={() => onUnwrap?.()}
        >
          Unwrap
        </button>
        <p className="rounded-lg bg-action/80 px-3 py-0.5 text-sm font-semibold text-paper">
          or zigzag your finger to rip it open
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
    <li className="flex items-center gap-4 text-left">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-action text-paper">
        {icon}
      </span>
      <span className="font-display text-2xl">{children}</span>
    </li>
  );
}

/** Before the first gift, so a child knows they unwrap them all and then keep one. */
function Intro({ count, recipientName, onStart }: { count: number; recipientName: string; onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        className="reveal-in w-full max-w-sm rounded-3xl bg-paper p-7 text-center text-ink shadow-xl"
      >
        <h1 id="intro-title" className="text-3xl font-semibold">
          {recipientName}, you have {count} surprises!
        </h1>
        <ol className="mx-auto mt-6 flex w-fit flex-col gap-4">
          <IntroStep icon={GIFT_ICON}>{count === 2 ? "Unwrap both" : `Unwrap all ${count}`}</IntroStep>
          <IntroStep icon={HEART_ICON}>Pick 1 to keep</IntroStep>
        </ol>
        <button type="button" className="button mt-7 w-full text-lg" autoFocus onClick={onStart}>
          Start unwrapping
        </button>
      </section>
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
  const [edge, setEdge] = useState<Point[]>([]);
  const [remaining, setRemaining] = useState(options);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(options.length === 1 ? options[0].id : "");
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [done, setDone] = useState(chosen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (done) return <Done token={token} giverName={giverName} cardId={cardId} chosen={done} />;

  const selectedOption = remaining.find(({ id }) => id === selected);
  const ready = !!selectedOption?.variants.every(({ name }) => choice[name]);

  function unwrap(path?: Point[]) {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEdge(tearEdge(path));
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
    setChoice({});
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
      setDone({ ...option, details, thankYou: null });
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
            left={left}
            onUnwrap={intro ? undefined : unwrap}
          />
        ) : (
          <section className="fixed inset-0 flex flex-col bg-page">
            {stage === "opened" && <Confetti key={option.id} />}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-20">
              <div className="mx-auto w-full max-w-md">
                <div className={`mx-auto w-full max-w-72 ${stage === "storing" ? "to-basket" : ""}`}>
                  <Photos images={option.images} className="aspect-square bg-white" />
                </div>
                <h1 className="mt-4 text-2xl font-semibold">{option.title}</h1>
                {(option.ageLabel || option.size) && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {option.ageLabel && <li className="chip">{option.ageLabel}</li>}
                    {option.size && <li className="chip">Size {option.size}</li>}
                  </ul>
                )}
                {option.summary && <p className="mt-2 font-medium">Comes in {option.summary}</p>}
                {option.description && <MoreText text={option.description} className="mt-2 text-soft" />}
              </div>
            </div>
            <div className="mx-auto w-full max-w-md px-6 pb-6 pt-2">
              <p className="text-center font-display text-lg">
                {more === 0
                  ? "All unwrapped!"
                  : `${more} more ${more === 1 ? "surprise" : "surprises"}`}
              </p>
              <button
                type="button"
                className="button mt-2 w-full text-lg"
                disabled={stage !== "opened"}
                onClick={storeGift}
              >
                {more > 0
                  ? "Next surprise"
                  : options.length === 1
                    ? "Review your gift"
                    : "Review all gifts"}
              </button>
            </div>
          </section>
        )}
        {stage === "ripping" && (
          <div aria-hidden="true">
            <div className="rip rip-left">
              <div className="fixed inset-0" style={{ clipPath: tearClip(edge, "left") }}>
                <Wrapped option={option} recipientName={recipientName} left={left} />
              </div>
            </div>
            <div className="rip rip-right">
              <div className="fixed inset-0" style={{ clipPath: tearClip(edge, "right") }}>
                <Wrapped option={option} recipientName={recipientName} left={left} />
              </div>
            </div>
          </div>
        )}
        <Basket count={index} />
        {intro && (
          <Intro count={options.length} recipientName={recipientName} onStart={() => setIntro(false)} />
        )}
      </>
    );
  }

  return (
    <section className="reveal-in w-full max-w-xl">
      {note && (
        <div className="-rotate-1 rounded-2xl border border-line bg-paper p-5 shadow-md">
          <p className="text-sm text-soft">A note from {giverName}</p>
          <p className="mt-1 font-hand text-3xl leading-snug wrap-anywhere">{note}</p>
        </div>
      )}
      <h1 className="mt-6 text-center text-3xl font-semibold">
        {options.length === 1 ? "It's all yours!" : "Pick 1 to keep!"}
      </h1>
      {remaining.length === 0 ? (
        <p className="mt-4 text-center text-soft">
          These all sold out. Ask {giverName} to pick something new.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {remaining.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className={`w-full rounded-2xl border bg-paper p-3 text-left ${selected === option.id ? "border-action ring-2 ring-action" : "border-line"}`}
                aria-pressed={selected === option.id}
                onClick={() => select(option.id)}
              >
                <GiftPicture option={option} />
                <span className="mt-2 block font-semibold">{option.title}</span>
                {option.summary && <span className="block text-sm text-soft">{option.summary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedOption?.variants.map((group) => (
        <fieldset key={group.name} className="mt-5">
          <legend className="text-lg font-semibold">Pick your {group.name.toLowerCase()}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.values.map((value) => (
              <button
                key={value}
                type="button"
                className={`chip ${choice[group.name] === value ? "ring-2 ring-action" : ""}`}
                aria-pressed={choice[group.name] === value}
                onClick={() => setChoice((current) => ({ ...current, [group.name]: value }))}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
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
          {busy ? "Sending..." : "This one!"}
        </button>
      )}
    </section>
  );
}
