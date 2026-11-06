import type { Metadata } from "next";
import { NewGiftForm } from "./new-gift-form";

export const metadata: Metadata = { title: "Create a gift · Tap Gift" };

export default function NewGiftPage() {
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mt-4 text-3xl font-semibold">Create a gift</h1>
      <p className="mt-2 text-soft">
        Write what you&apos;d say in a card. We&apos;ve filled in an example you can change.
      </p>
      <NewGiftForm />
    </main>
  );
}
