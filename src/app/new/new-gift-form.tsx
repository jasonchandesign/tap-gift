"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  AUDIENCES,
  DEFAULT_SKIN,
  SKIN_IDS,
  SKINS,
  skinStyle,
  type Audience,
  type SkinId,
} from "@/lib/skins";
import { Bow, GiftTag } from "../gift-wrap";
import { Logo } from "../logo";

function swatch(id: SkinId) {
  const { wrap, ribbon } = SKINS[id];
  return `linear-gradient(90deg, ${wrap} 0 44%, ${ribbon} 44% 56%, ${wrap} 56% 100%)`;
}

type Editing = {
  id: string;
  recipientName: string;
  recipientLastName: string;
  recipientAge: number;
  skin: string;
  audience: string;
};

type Props = { cardId?: string; editing?: Editing };

export function NewGiftForm({ cardId, editing }: Props) {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState(editing?.recipientName ?? "");
  const [recipientLastName, setRecipientLastName] = useState(editing?.recipientLastName ?? "");
  const [recipientAge, setRecipientAge] = useState(editing ? String(editing.recipientAge) : "");
  const [audience, setAudience] = useState<Audience>(
    AUDIENCES.find(({ id }) => id === editing?.audience) ?? AUDIENCES[2],
  );
  const [skin, setSkin] = useState<SkinId>(
    SKIN_IDS.find((id) => id === editing?.skin) ?? DEFAULT_SKIN,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Once this form has made a gift, going back and continuing again edits it rather than making another.
  const [giftId, setGiftId] = useState(editing?.id);

  // Next.js keeps this page alive in the background, so coming back would still show "One moment...".
  useEffect(() => () => setBusy(false), []);

  function chooseAudience(next: Audience) {
    setAudience(next);
    setSkin(next.skin);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const details = {
        recipientName,
        recipientLastName,
        recipientAge: Number(recipientAge),
        skin,
        audience: audience.id,
      };
      const response = await fetch(giftId ? `/api/gifts/${giftId}` : "/api/gifts", {
        method: giftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(giftId ? details : { ...details, cardId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setGiftId(data.id);
      if (editing) router.replace(`/gifts/${data.id}/shop`);
      else router.push(`/gifts/${data.id}/shop`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      {cardId && <Logo className="mb-1 text-xl" />}
      <h1 className="text-3xl font-semibold">Who is this gift for?</h1>
      <div className="grid grid-cols-[1fr_1fr_4.5rem] gap-2.5">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-soft">
          First name
          <input
            className="field text-ink"
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            autoComplete="off"
            required
            maxLength={60}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-soft">
          Last name
          <input
            className="field text-ink"
            value={recipientLastName}
            onChange={(event) => setRecipientLastName(event.target.value)}
            autoComplete="off"
            required
            maxLength={60}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-soft">
          Age
          <input
            type="number"
            className="field text-ink"
            value={recipientAge}
            onChange={(event) => setRecipientAge(event.target.value)}
            min={1}
            max={17}
            required
          />
        </label>
        <p className="col-span-3 -mt-1 text-sm text-soft">
          The last name is only for shipping. The gift tag shows the first name.
        </p>
      </div>

      <div className="flex gap-1 rounded-full bg-mist p-1" role="group" aria-label="Who the gift is for">
        {AUDIENCES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={option.id === audience.id}
            className={`min-h-11 flex-auto whitespace-nowrap rounded-full px-3 text-sm font-semibold ${option.id === audience.id ? "bg-ink text-white" : ""}`}
            onClick={() => chooseAudience(option)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div style={skinStyle(skin)}>
        <div className="wrap-paper flex h-60 flex-col items-center justify-between rounded-2xl pb-6 pt-3">
          <Bow className="relative w-32" />
          <div className="relative">
            <GiftTag recipientName={recipientName || "Your kid"} small />
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold">What they&apos;ll see</span>
        <span className="text-sm text-soft">
          {skin === audience.skin ? `Picked for ${audience.phrase}` : "Your pick"}
        </span>
      </div>
      <div className="flex gap-2">
        {SKIN_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === skin}
            className={`flex h-16 min-w-0 flex-1 flex-col gap-1 rounded-2xl border-2 bg-paper p-1.5 text-xs font-semibold ${id === skin ? "border-action" : "border-line"}`}
            onClick={() => setSkin(id)}
          >
            <span className="block w-full flex-1 rounded-lg" style={{ background: swatch(id) }} />
            {SKINS[id].label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-alert">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={busy}>
        {busy ? "One moment..." : "Continue"}
      </button>
    </form>
  );
}
