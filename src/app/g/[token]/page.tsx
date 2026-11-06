import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { Suspense } from "react";
import { chosenGift } from "@/lib/checkout";
import { selectedOptions, type VariantChoice } from "@/lib/chat";
import { getGiftByToken, giftUrl } from "@/lib/gifts";
import { isSizeGroup, variantSummary } from "@/lib/gifts-format";
import { Reveal } from "./reveal";

export const metadata: Metadata = {
  title: "A gift for you · Tap Gift",
  description: "Someone sent you a gift. Open it to unwrap your surprises.",
};

type Props = PageProps<"/g/[token]">;

function details(choice: VariantChoice) {
  return Object.values(choice).join(", ");
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="m-auto max-w-md p-8 text-center">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-soft">{body}</p>
    </div>
  );
}

async function Gift({ params }: Props) {
  await connection();
  const { token } = await params;
  const gift = await getGiftByToken(token);
  if (!gift) notFound();

  if (gift.status === "draft") {
    return <Message title="This gift isn't ready yet" body="Check back soon." />;
  }

  const [picks, chosen, qr] = await Promise.all([
    selectedOptions(gift.id),
    chosenGift(gift.id),
    QRCode.toString(giftUrl(gift.token), { type: "svg", margin: 1 }),
  ]);

  if (!chosen && !picks.length) {
    return <Message title="This gift isn't ready yet" body="Check back soon." />;
  }

  // Prices and stores stay on the server, because a gift shouldn't show what it cost.
  return (
    <div className="m-auto flex w-full max-w-4xl items-center justify-center gap-10 p-6">
      <Reveal
        token={gift.token}
        giverName={gift.giver_name}
        recipientName={gift.recipient_name}
        note={gift.note}
        options={picks.map((pick) => ({
          id: String(pick.id),
          title: pick.title,
          imageUrl: pick.image_url,
          summary: variantSummary(pick.variants_json),
          size: details(pick.variant_choice_json),
          variants: pick.variants_json.filter((group) => !isSizeGroup(group)),
        }))}
        chosen={
          chosen && {
            title: chosen.title,
            imageUrl: chosen.image_url,
            details: details(chosen.variant_choice_json),
            thankYou: chosen.thank_you_note,
          }
        }
      />
      {!chosen && (
        <aside className="hidden w-44 shrink-0 text-center lg:block">
          <div className="rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-2 text-sm text-soft">Continue on your phone</p>
        </aside>
      )}
    </div>
  );
}

export default function GiftPage(props: Props) {
  return (
    <main className="flex flex-1">
      <Suspense fallback={<p className="m-auto text-soft">Opening...</p>}>
        <Gift {...props} />
      </Suspense>
    </main>
  );
}
