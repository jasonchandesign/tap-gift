"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MicButton } from "../mic-button";

const SUGGESTIONS = [
  "Loves horses and drawing",
  "Big soccer fan, follows Messi",
  "Into Pokémon and video games",
  "Science experiments and slime",
];

export function NewGiftForm({ cardId }: { cardId?: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(SUGGESTIONS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giverName: form.get("giverName"),
          recipientName: form.get("recipientName"),
          recipientAge: Number(form.get("recipientAge")),
          prompt,
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
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 font-medium">
        Your name
        <input name="giverName" className="field" defaultValue="Grandma" required maxLength={60} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 font-medium">
          Kid&apos;s first name
          <input name="recipientName" className="field" defaultValue="Mia" required maxLength={60} />
        </label>
        <label className="flex flex-col gap-1 font-medium">
          Age
          <input
            name="recipientAge"
            type="number"
            className="field"
            defaultValue={9}
            min={1}
            max={17}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 font-medium">
        What are they into?
        <textarea
          className="field"
          rows={3}
          required
          maxLength={500}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="chip"
            onClick={() => setPrompt(suggestion)}
          >
            {suggestion}
          </button>
        ))}
        <MicButton onText={setPrompt} />
      </div>
      {error && (
        <p role="alert" className="text-berry">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={busy}>
        {busy ? "Finding ideas..." : "Find gift ideas"}
      </button>
    </form>
  );
}
