import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "No gift on this card · Tap Gift" };

export default function CardEmptyPage() {
  return (
    <main className="m-auto max-w-md p-8 text-center">
      <h1 className="text-3xl font-semibold">No gift on this card yet</h1>
      <p className="mt-3 text-soft">
        This card doesn&apos;t have an active gift. Its last gift may already be opened. The giver
        can link it to a new one.
      </p>
      <Link href="/new" className="button mt-6">
        Create a gift
      </Link>
    </main>
  );
}
