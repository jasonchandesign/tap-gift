import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { Suspense } from "react";
import { formatDollars, getGiftByToken, giftUrl } from "@/lib/gifts";
import { GiftCover } from "./gift-cover";

export const metadata: Metadata = {
  title: "A gift for you · Tap Gift",
  description: "Someone sent you a gift. Open it to choose what you want.",
};

type Props = PageProps<"/g/[token]">;

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
  if (gift.status === "charged") {
    return (
      <Message
        title="This gift has been opened"
        body={`${gift.recipient_name} already picked something special.`}
      />
    );
  }

  const url = giftUrl(gift.token);
  const qr = await QRCode.toString(url, { type: "svg", margin: 1 });

  return (
    <div className="m-auto flex w-full max-w-4xl items-center justify-center gap-10 p-6">
      <GiftCover
        giverName={gift.giver_name}
        recipientName={gift.recipient_name}
        note={gift.note}
        budget={formatDollars(gift.budget_cents)}
      />
      <aside className="hidden w-44 shrink-0 text-center lg:block">
        <div className="rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="mt-2 text-sm text-soft">Continue on your phone</p>
      </aside>
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
