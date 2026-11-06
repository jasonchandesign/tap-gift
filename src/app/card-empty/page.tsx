import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Unknown card · Tap Gift" };

export default function CardEmptyPage() {
  return (
    <main className="m-auto max-w-md p-8 text-center">
      <h1 className="text-3xl font-semibold">We don&apos;t recognize this card</h1>
      <p className="mt-3 text-soft">
        Its link doesn&apos;t look right. You can still create a gift and send it by text or
        email.
      </p>
      <Link href="/new" className="button mt-6">
        Create a gift
      </Link>
    </main>
  );
}
