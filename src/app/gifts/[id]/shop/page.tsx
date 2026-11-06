import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { latestOptions, listMessages, MAX_TURNS, selectedOptions } from "@/lib/chat";
import { getGift } from "@/lib/gifts";
import { ShopClient } from "./shop-client";

type Props = PageProps<"/gifts/[id]/shop">;

async function Shop({ params }: Props) {
  await connection();
  const { id } = await params;
  const gift = await getGift(id);
  if (!gift) notFound();
  if (gift.status !== "draft") redirect(`/gifts/${gift.id}/share`);

  const [messages, options, selected] = await Promise.all([
    listMessages(gift.id),
    latestOptions(gift.id),
    selectedOptions(gift.id),
  ]);

  return (
    <ShopClient
      giftId={gift.id}
      recipientName={gift.recipient_name}
      initialBudgetCents={gift.budget_cents}
      initialAvoid={gift.rules_json.avoid}
      initialSize={gift.rules_json.size}
      initialMessages={messages}
      initialOptions={options}
      initialSelected={selected}
      initialTurnsLeft={MAX_TURNS - gift.turns_used}
    />
  );
}

export default function ShopPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 pb-32">
      <h1 className="mt-4 text-3xl font-semibold">Narrow it down</h1>
      <Suspense fallback={<p className="mt-6 text-soft">Loading...</p>}>
        <Shop {...props} />
      </Suspense>
    </main>
  );
}
