"use client";

import { useState } from "react";

type Props = { giverName: string; recipientName: string; note: string; budget: string };

export function GiftCover({ giverName, recipientName, note, budget }: Props) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <section className="w-full max-w-md rounded-3xl bg-berry p-10 text-center text-white shadow-lg">
        <p className="text-lg">A gift for</p>
        <h1 className="mt-1 text-5xl font-semibold">{recipientName}</h1>
        <p className="mt-4 text-lg">From {giverName}</p>
        <button
          type="button"
          className="mt-8 rounded-full bg-white px-8 py-4 text-lg font-semibold text-berry"
          onClick={() => setOpened(true)}
        >
          Open your gift
        </button>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-line bg-paper p-8">
      <p className="text-soft">A note from {giverName}</p>
      <p className="mt-2 text-xl">{note}</p>
      <p className="mt-6 text-3xl font-semibold text-pine">{budget} to spend</p>
      <p className="mt-6 text-soft">Your shopper will be here soon.</p>
    </section>
  );
}
