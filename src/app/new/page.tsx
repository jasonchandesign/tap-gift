import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { cardIsFree, getGift } from "@/lib/gifts";
import { NewGiftForm } from "./new-gift-form";

export const metadata: Metadata = { title: "Create a gift · Tap Gift" };

type Props = PageProps<"/new">;

async function Start({ searchParams }: Props) {
  await connection();
  const { card, gift: giftId } = await searchParams;
  // Going back from the chat edits that gift, so the chat and cart carry over.
  const gift = typeof giftId === "string" ? await getGift(giftId) : null;
  if (gift?.status === "draft") {
    return (
      <NewGiftForm
        cardId={gift.card_id ?? undefined}
        editing={{
          id: gift.id,
          recipientName: gift.recipient_name,
          recipientLastName: gift.recipient_last_name,
          recipientAge: gift.recipient_age,
          skin: gift.skin,
          audience: gift.audience,
        }}
      />
    );
  }
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
