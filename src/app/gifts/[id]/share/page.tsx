import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatDollars, getGift, giftUrl } from "@/lib/gifts";
import { CardSetup } from "./card-setup";
import { SendCard } from "./send-card";

type Props = PageProps<"/gifts/[id]/share">;

async function Share({ params }: Props) {
  await connection();
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (gift.status === "draft") redirect(`/gifts/${gift.id}/confirm`);

  const url = giftUrl(gift.token);
  return (
    <>
      <p className="mt-2 text-soft">
        PayPal is saved with $0 charged. {gift.recipient_name} can spend up to{" "}
        {formatDollars(gift.budget_cents)}.
      </p>
      <SendCard
        url={url}
        message={`${gift.giver_name} sent ${gift.recipient_name} a gift! Open it here: ${url}`}
        parentContact={gift.parent_contact}
      />
      <CardSetup giftId={gift.id} />
    </>
  );
}

export default function SharePage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mt-4 text-3xl font-semibold">Send the gift</h1>
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Share {...props} />
      </Suspense>
    </main>
  );
}
