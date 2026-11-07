"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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

export function NewGiftForm({ cardId }: { cardId?: string }) {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState("Mia");
  const [recipientAge, setRecipientAge] = useState("9");
  const [audience, setAudience] = useState<Audience>(AUDIENCES[2]);
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function chooseAudience(next: Audience) {
    setAudience(next);
    setSkin(next.skin);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientAge: Number(recipientAge),
          skin,
          audience: audience.id,
          cardId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/gifts/${data.id}/shop`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      {cardId && <Logo className="mb-1 text-xl" />}
      {cardId && (
        <p className="self-start rounded-full bg-mist px-3 py-1.5 text-sm font-semibold text-action">
          Your card is ready to fill
        </p>
      )}
      <h1 className="text-3xl font-semibold">{cardId ? "Let's fill this card" : "Who is it for?"}</h1>
      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-soft">
          Kid&apos;s first name
          <input
            className="field text-ink"
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
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
