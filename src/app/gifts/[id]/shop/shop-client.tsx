"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ChatMessage, ShownOption, VariantChoice } from "@/lib/chat";
import { formatDollars, isSizeGroup, matchSize, variantSummary } from "@/lib/gifts-format";
import { MicButton } from "../../../mic-button";

const MAX_PICKS = 5;
const REFINEMENTS = ["Under $100", "Under $50", "Under $25", "More creative", "No screens"];

type Props = {
  giftId: string;
  recipientName: string;
  initialBudgetCents: number;
  initialAvoid: string[];
  initialSize?: string;
  initialMessages: ChatMessage[];
  initialOptions: ShownOption[];
  initialSelected: ShownOption[];
  initialTurnsLeft: number;
};

type Picks = Record<string, { option: ShownOption; choice: VariantChoice }>;

function sizesChosen({ option, choice }: Picks[string]) {
  return option.variants_json.filter(isSizeGroup).every((group) => choice[group.name]);
}

export function ShopClient(props: Props) {
  const router = useRouter();
  const { giftId, recipientName } = props;
  const [messages, setMessages] = useState(props.initialMessages);
  const [options, setOptions] = useState(props.initialOptions);
  const [budgetCents, setBudgetCents] = useState(props.initialBudgetCents);
  const [avoid, setAvoid] = useState(props.initialAvoid);
  const [size, setSize] = useState(props.initialSize);
  const [turnsLeft, setTurnsLeft] = useState(props.initialTurnsLeft);
  const [picks, setPicks] = useState<Picks>(() =>
    Object.fromEntries(
      props.initialSelected.map((option) => [
        option.id,
        { option, choice: option.variant_choice_json },
      ]),
    ),
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const picked = Object.values(picks);
  const earlierPicks = picked.filter(
    ({ option }) => !options.some((shown) => shown.id === option.id),
  );
  const lastReply = messages.findLast((message) => message.role === "assistant");

  async function ask(wish: string) {
    if (!wish.trim() || busy) return;
    setBusy(true);
    setError("");
    setText("");

    const response = await fetch(`/api/gifts/${giftId}/shop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: wish }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);

    if (!response?.ok || !data) {
      setText(wish);
      setError(data?.error ?? "That didn't work. Please try again.");
    } else {
      setMessages((current) => [
        ...current,
        { role: "user", content: wish },
        { role: "assistant", content: data.message },
      ]);
      if (data.options) setOptions(data.options);
      setBudgetCents(data.budgetCents);
      setAvoid(data.rules.avoid);
      setSize(data.rules.size);
      setTurnsLeft(data.turnsLeft);
    }
    setBusy(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(text);
  }

  function toggle(option: ShownOption) {
    setPicks((current) => {
      const { [option.id]: existing, ...rest } = current;
      if (existing) return rest;
      if (Object.keys(current).length >= MAX_PICKS) return current;
      // A size the gifter already gave fills in by itself.
      const sizes = option.variants_json.filter(isSizeGroup).flatMap((group) => {
        const match = size && matchSize(group.values, size);
        return match ? [[group.name, match]] : [];
      });
      return { ...current, [option.id]: { option, choice: Object.fromEntries(sizes) } };
    });
  }

  function chooseSize(option: ShownOption, name: string, value: string) {
    setPicks((current) => ({
      ...current,
      [option.id]: { option, choice: { ...current[option.id].choice, [name]: value } },
    }));
  }

  async function next() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/gifts/${giftId}/picks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        picks: picked.map(({ option, choice }) => ({ optionId: String(option.id), choice })),
      }),
    }).catch(() => null);

    if (response?.ok) {
      router.push(`/gifts/${giftId}/confirm`);
    } else {
      const data = await response?.json().catch(() => null);
      setError(data?.error ?? "That didn't save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-pine px-3 py-1 text-white">
          Up to {formatDollars(budgetCents)}
        </span>
        {size && (
          <span className="rounded-full border border-line bg-paper px-3 py-1">Size {size}</span>
        )}
        {avoid.map((term) => (
          <span key={term} className="rounded-full border border-line bg-paper px-3 py-1">
            No {term}
          </span>
        ))}
      </div>

      <p className="mt-4 text-lg" aria-live="polite">
        {busy ? "Looking..." : (lastReply?.content ?? `Tell me what ${recipientName} would love.`)}
      </p>

      {options.length > 0 && (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => {
            const pick = picks[option.id];
            return (
              <li
                key={option.id}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-paper ${pick ? "border-berry ring-2 ring-berry" : "border-line"}`}
              >
                {/* Images come from many stores, so next/image can't list their hosts. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={option.image_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="aspect-square w-full bg-white object-contain"
                />
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="font-sans font-semibold">{option.title}</h2>
                  <p className="mt-1 text-xl font-semibold text-pine">
                    {formatDollars(option.price_cents)}
                  </p>
                  <p className="mt-2">{option.reason}</p>
                  <p className="mt-1 text-sm text-soft">{option.merchant}</p>
                  {variantSummary(option.variants_json) && (
                    <p className="mt-1 text-sm font-medium text-pine">
                      {variantSummary(option.variants_json)}. {recipientName} chooses.
                    </p>
                  )}
                  {pick &&
                    option.variants_json.filter(isSizeGroup).map((group) => (
                      <label key={group.name} className="mt-3 flex flex-col gap-1 text-sm font-medium">
                        {group.name}
                        <select
                          className="field"
                          value={pick.choice[group.name] ?? ""}
                          onChange={(event) => chooseSize(option, group.name, event.target.value)}
                        >
                          <option value="" disabled>
                            Choose a size
                          </option>
                          {group.values.map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  <div className="min-h-3 flex-1" />
                  <button
                    type="button"
                    className={`w-full ${pick ? "button" : "button-quiet"}`}
                    onClick={() => toggle(option)}
                    aria-pressed={!!pick}
                  >
                    {pick ? "Keeping this" : "Keep this one"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {earlierPicks.length > 0 && (
        <section className="mt-5">
          <h2 className="font-sans font-semibold">Also keeping</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {earlierPicks.map(({ option }) => (
              <li key={option.id} className="flex items-center justify-between gap-3">
                <span>
                  {option.title}, {formatDollars(option.price_cents)}
                </span>
                <button type="button" className="chip" onClick={() => toggle(option)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {turnsLeft > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {REFINEMENTS.map((refinement) => (
              <button
                key={refinement}
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => void ask(refinement)}
              >
                {refinement}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-3 flex gap-2">
            <input
              className="field"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={500}
              placeholder="Tell me more, or ask for something different"
              aria-label="Refine the gift ideas"
            />
            <MicButton onText={(spoken) => void ask(spoken)} />
            <button type="submit" className="button" disabled={busy || !text.trim()}>
              Send
            </button>
          </form>
        </>
      ) : (
        <p className="mt-6 text-soft">That&apos;s all the searches for this gift.</p>
      )}

      {error && (
        <p className="mt-3 text-berry" role="alert">
          {error}
        </p>
      )}

      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper p-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p>
              {picked.length} of {MAX_PICKS} kept
              {!picked.every(sizesChosen) && (
                <span className="block text-sm text-soft">Choose a size on each gift</span>
              )}
            </p>
            <button
              type="button"
              className="button"
              disabled={saving || !picked.every(sizesChosen)}
              onClick={next}
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
