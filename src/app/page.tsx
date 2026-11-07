import Link from "next/link";
import { Logo } from "./logo";

const STEPS = [
  ["Tell us what they love", "AI finds a few great ideas."],
  ["Keep your favorites", "Pay once with PayPal."],
  ["Hand over the card or send a link", "They tap, unwrap and choose."],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 p-6">
      <Logo className="text-xl" />
      <h1 className="mt-2 text-4xl font-semibold leading-tight">
        You narrow it down. They unwrap it.
      </h1>
      <p className="text-lg text-soft">
        The easy way to give a child a gift they&apos;ll love, with their favorite picked by them.
      </p>
      <ol className="flex flex-col gap-4 rounded-2xl border border-line p-5">
        {STEPS.map(([title, detail], index) => (
          <li key={title} className="flex gap-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist font-bold text-action">
              {index + 1}
            </span>
            <span>
              <span className="block font-bold">{title}</span>
              <span className="block text-soft">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex-1" />
      <Link href="/new" className="button text-lg">
        Start a gift
      </Link>
      <p className="text-center text-sm text-soft">
        If they choose a cheaper gift, you get the difference back. Have a Tap Gift card? Tap it
        with your phone to start.
      </p>
    </main>
  );
}
