import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { allOptions, listMessages, MAX_TURNS, selectedOptions } from "@/lib/chat";
import { getGift } from "@/lib/gifts";
import { starterIdeas } from "@/lib/starters";
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
    allOptions(gift.id),
    selectedOptions(gift.id),
  ]);

  return (
    <ShopClient
      giftId={gift.id}
      recipientName={gift.recipient_name}
      audienceId={gift.audience}
      starters={starterIdeas(gift)}
      initialSize={gift.rules_json.size}
      initialMessages={messages}
      initialOptions={options}
      initialCart={selected}
      initialTurnsLeft={MAX_TURNS - gift.turns_used}
    />
  );
}

export default function ShopPage(props: Props) {
  return (
    <main className="flex h-dvh flex-col">
      <Suspense fallback={<p className="m-auto text-soft">Loading...</p>}>
        <Shop {...props} />
      </Suspense>
    </main>
  );
}
