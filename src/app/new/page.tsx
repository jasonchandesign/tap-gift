import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { cardIsFree } from "@/lib/gifts";
import { NewGiftForm } from "./new-gift-form";

export const metadata: Metadata = { title: "Create a gift · Tap Gift" };

type Props = PageProps<"/new">;

async function Start({ searchParams }: Props) {
  await connection();
  const { card } = await searchParams;
  const cardId = typeof card === "string" && (await cardIsFree(card)) ? card : undefined;

  return (
    <>
      <h1 className="mt-4 text-3xl font-semibold">
        {cardId ? "Let's fill this card" : "Who's the gift for?"}
      </h1>
      <p className="mt-2 text-soft">
        Tell us about them. We&apos;ll find a few ideas, and you can narrow them down.
      </p>
      <NewGiftForm cardId={cardId} />
    </>
  );
}

export default function NewGiftPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Start {...props} />
      </Suspense>
    </main>
  );
}
