"use client";

import { useState, type FormEvent } from "react";

export type KidOption = {
  id: string;
  title: string;
  imageUrl: string;
  summary: string;
  size: string;
  variants: { name: string; values: string[] }[];
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
  options: KidOption[];
  chosen: KidChosen | null;
};

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

function Done({ token, giverName, chosen }: Pick<Props, "token" | "giverName"> & { chosen: KidChosen }) {
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
    else setError("That didn't send. Please try again.");
  }

  return (
    <section className="reveal-in w-full max-w-md rounded-3xl border border-line bg-paper p-8 text-center">
      <h1 className="text-3xl font-semibold">It&apos;s on its way!</h1>
      <div className="mx-auto mt-5 w-56">
        <GiftPicture option={chosen} />
      </div>
      <p className="mt-4 text-xl font-semibold">{chosen.title}</p>
      {chosen.details && <p className="text-soft">{chosen.details}</p>}
      {sent ? (
        <p className="mt-6 text-lg text-pine">Your thank-you is on its way to {giverName}.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 text-left">
          <label className="flex flex-col gap-1 font-medium">
            Say thank you to {giverName}
            <textarea name="note" className="field text-lg" rows={3} required maxLength={500} />
          </label>
          {error && (
            <p role="alert" className="text-berry">
              {error}
            </p>
          )}
          <button type="submit" className="button">
            Send thank you
          </button>
        </form>
      )}
    </section>
  );
}

export function Reveal({ token, giverName, recipientName, note, options, chosen }: Props) {
  const [stage, setStage] = useState<"cover" | "note" | "unwrap" | "choose">("cover");
  const [remaining, setRemaining] = useState(options);
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState(options.length === 1 ? options[0].id : "");
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [done, setDone] = useState(chosen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (done) return <Done token={token} giverName={giverName} chosen={done} />;

  const selectedOption = remaining.find(({ id }) => id === selected);
  const ready = !!selectedOption?.variants.every(({ name }) => choice[name]);

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

  if (stage === "cover") {
    return (
      <section className="w-full max-w-md rounded-3xl bg-berry p-10 text-center text-white shadow-lg">
        <p className="text-lg">A gift for</p>
        <h1 className="mt-1 text-5xl font-semibold">{recipientName}</h1>
        <p className="mt-4 text-lg">From {giverName}</p>
        <button
          type="button"
          className="mt-8 rounded-full bg-white px-8 py-4 text-lg font-semibold text-berry"
          onClick={() => setStage("note")}
        >
          Open your gift
        </button>
      </section>
    );
  }

  if (stage === "note") {
    return (
      <section className="reveal-in w-full max-w-md rounded-3xl border border-line bg-paper p-8">
        <p className="text-soft">A note from {giverName}</p>
        <p className="mt-2 text-2xl">{note}</p>
        <button type="button" className="button mt-6 w-full" onClick={() => setStage("unwrap")}>
          {options.length === 1 ? "Unwrap your gift" : `Unwrap your ${options.length} gifts`}
        </button>
      </section>
    );
  }

  if (stage === "unwrap") {
    const option = options[index];
    const last = index === options.length - 1;
    return (
      <section className="w-full max-w-md text-center">
        <p className="text-soft">
          Gift {index + 1} of {options.length}
        </p>
        {opened ? (
          <div key={option.id} className="reveal-in mt-4 rounded-3xl border border-line bg-paper p-6">
            <GiftPicture option={option} />
            <h2 className="mt-4 text-xl font-semibold">{option.title}</h2>
            {option.summary && <p className="text-soft">Comes in {option.summary}</p>}
            <button
              type="button"
              className="button mt-5 w-full"
              onClick={() => {
                setOpened(false);
                if (last) setStage("choose");
                else setIndex(index + 1);
              }}
            >
              {last ? (options.length === 1 ? "Keep going" : "Choose one") : "Next gift"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="gift-box mx-auto mt-4"
            aria-label={`Unwrap gift ${index + 1}`}
            onClick={() => setOpened(true)}
          >
            <span className="gift-ribbon" aria-hidden="true" />
            <span className="relative font-semibold">Tap to unwrap</span>
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="reveal-in w-full max-w-xl">
      <h1 className="text-center text-3xl font-semibold">
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
                className={`w-full rounded-2xl border bg-paper p-3 text-left ${selected === option.id ? "border-berry ring-2 ring-berry" : "border-line"}`}
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
                className={`chip ${choice[group.name] === value ? "ring-2 ring-berry" : ""}`}
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
        <p role="alert" className="mt-3 text-center text-berry">
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
