import type { Metadata } from "next";
import { NewGiftForm } from "./new-gift-form";

export const metadata: Metadata = { title: "Create a gift · Tap Gift" };

export default function NewGiftPage() {
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mt-4 text-3xl font-semibold">Who&apos;s the gift for?</h1>
      <p className="mt-2 text-soft">
        Tell us about them. We&apos;ll find a few ideas, and you can narrow them down.
      </p>
      <NewGiftForm />
    </main>
  );
}
