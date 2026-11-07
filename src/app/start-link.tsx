"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** A blank card lands here, and its ID rides along so the paid gift goes on that card. */
export function StartLink() {
  const card = useSearchParams().get("card");
  return (
    <>
      <Link href={card ? `/new?card=${encodeURIComponent(card)}` : "/new"} className="button text-lg">
        Start a gift
      </Link>
      <StartNote hasCard={!!card} />
    </>
  );
}

export function StartNote({ hasCard = false }: { hasCard?: boolean }) {
  return (
    <p className="text-center text-sm text-soft">
      If they choose a cheaper gift, you get the difference back.
      {!hasCard && (
        <>
          <br />
          Have a Tap Gift card? Tap it with your phone to start.
        </>
      )}
    </p>
  );
}
