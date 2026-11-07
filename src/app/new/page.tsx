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
  return <NewGiftForm cardId={cardId} />;
}

export default function NewGiftPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-xl p-5">
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Start {...props} />
      </Suspense>
    </main>
  );
}
