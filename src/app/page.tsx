import Link from "next/link";
import { Present } from "./present";

const STEPS = [
  ["Tell us what they love", "AI narrows it down to a few great ideas."],
  ["Keep your favorites", "Pay once with PayPal, and send a card or a link."],
  ["They tap and unwrap", "They choose one. If it costs less, you get the difference back."],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-40">
        <Present wiggle />
      </div>
      <h1 className="text-5xl font-semibold">Tap Gift</h1>
      <p className="text-xl text-soft">Choosing the gift is hard. Unwrapping it shouldn&apos;t be.</p>
      <ol className="flex w-full flex-col gap-3 text-left">
        {STEPS.map(([title, detail], index) => (
          <li key={title} className="flex gap-3 rounded-2xl border border-line bg-paper p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-berry font-semibold text-white">
              {index + 1}
            </span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="block text-soft">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <Link href="/new" className="button">
        Create a gift
      </Link>
    </main>
  );
}
