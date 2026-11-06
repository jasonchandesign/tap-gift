import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getGift } from "@/lib/gifts";
import { ConfirmForm } from "./confirm-form";

type Props = PageProps<"/gifts/[id]/confirm">;

async function Confirm({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const { check, paypal } = await searchParams;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (gift.status !== "draft") redirect(`/gifts/${gift.id}/share`);

  return (
    <ConfirmForm
      giftId={gift.id}
      recipientName={gift.recipient_name}
      budgetDollars={gift.budget_cents / 100}
      recipientAge={gift.recipient_age}
      rules={gift.rules_json}
      noteMismatch={check === "1"}
      paypalFailed={paypal === "failed"}
    />
  );
}

export default function ConfirmPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-xl p-6">
      <h1 className="mt-4 text-3xl font-semibold">Here&apos;s what I understood</h1>
      <p className="mt-2 text-soft">Check the rules. Change anything that isn&apos;t right.</p>
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Confirm {...props} />
      </Suspense>
    </main>
  );
}
