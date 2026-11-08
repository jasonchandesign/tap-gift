import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { Suspense } from "react";
import { chosenGift } from "@/lib/checkout";
import { selectedOptions, type VariantChoice } from "@/lib/chat";
import { getGiftByToken, giftUrl, type Gift as GiftRecord } from "@/lib/gifts";
import { isSizeGroup, photosOf, variantSummary } from "@/lib/gifts-format";
import { skinFor, skinStyle } from "@/lib/skins";
import { wrapPattern } from "@/lib/wraps";
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

  return (
    <div className="skin flex flex-1" style={skinStyle(gift.skin)}>
      <GiftBody gift={gift} />
    </div>
  );
}

async function GiftBody({ gift }: { gift: GiftRecord }) {
  if (gift.status === "draft") {
    return <Message title="This gift isn't ready yet" body="Check back soon." />;
  }

  if (gift.status === "canceled") {
    return (
      <Message
        title="This gift isn't available"
        body={`Ask ${gift.giver_name} what happened to it.`}
      />
    );
  }

  const [picks, chosen, qr] = await Promise.all([
    selectedOptions(gift.id),
    chosenGift(gift.id),
    QRCode.toString(giftUrl(gift.token), { type: "svg", margin: 1 }),
  ]);

  if (!chosen && !picks.length) {
    return (
      <Message
        title="Your gifts sold out"
        body={`Ask ${gift.giver_name} to pick something new.`}
      />
    );
  }

  const paperColor = skinFor(gift.skin).wrapMotif;

  // Prices and stores stay on the server, because a gift shouldn't show what it cost.
  return (
    <div className="mx-auto flex w-full max-w-4xl items-start justify-center p-6 pt-10">
      <Reveal
        token={gift.token}
        giverName={gift.giver_name}
        recipientName={gift.recipient_name}
        note={gift.note}
        cardId={gift.delivery === "card" ? gift.card_id : null}
        options={picks.map((pick, index) => {
          const wrap = wrapPattern(pick.wrap_json, index, paperColor);
          return {
            id: String(pick.id),
            title: pick.title,
            imageUrl: pick.image_url,
            images: photosOf(pick),
            ageLabel: pick.age_label,
            description: pick.description || pick.reason,
            summary: variantSummary(pick.variants_json),
            size: details(pick.variant_choice_json),
            variants: pick.variants_json.filter((group) => !isSizeGroup(group)),
            wrapImage: wrap.image,
            wrapSize: wrap.size,
          };
        })}
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
        <aside className="fixed bottom-4 right-4 z-40 hidden w-26 rounded-lg bg-white p-1.5 text-center text-xs text-ink lg:block">
          <div dangerouslySetInnerHTML={{ __html: qr }} />
          View on phone
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
