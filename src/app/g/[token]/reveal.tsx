"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { Confetti } from "../../confetti";
import { Bow, GiftTag, TagString } from "../../gift-wrap";

export type KidOption = {
  id: string;
  title: string;
  imageUrl: string;
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

function Wrapped({
  option,
  recipientName,
  left,
  onUnwrap,
}: {
  option: KidOption;
  recipientName: string;
  left: number;
  onUnwrap?: () => void;
}) {
  const paper = {
    "--wrap-pattern": option.wrapImage,
    "--wrap-pattern-size": option.wrapSize,
  } as CSSProperties;

  return (
    <section
      className="wrap-paper fixed inset-0 flex flex-col items-center overflow-y-auto px-6 pb-8 pt-8"
      style={paper}
    >
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
          onClick={onUnwrap}
        >
          Unwrap
        </button>
      </div>
    </section>
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

  function unwrap() {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
          <Wrapped option={option} recipientName={recipientName} left={left} onUnwrap={unwrap} />
        ) : (
          <section className="fixed inset-0 flex flex-col bg-page">
            {stage === "opened" && <Confetti key={option.id} />}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-20">
              <div className="mx-auto w-full max-w-md">
                <div className={`mx-auto w-full max-w-64 ${stage === "storing" ? "to-basket" : ""}`}>
                  <GiftPicture option={option} />
                </div>
                <h1 className="mt-5 text-2xl font-semibold">{option.title}</h1>
                {option.description && <p className="mt-2 text-soft">{option.description}</p>}
                {option.summary && <p className="mt-2 font-medium">Comes in {option.summary}</p>}
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
              <Wrapped option={option} recipientName={recipientName} left={left} />
            </div>
            <div className="rip rip-right">
              <Wrapped option={option} recipientName={recipientName} left={left} />
            </div>
          </div>
        )}
        <Basket count={index} />
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
        {options.length === 1 ? "It's all yours!" : "Which one do you want?"}
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
