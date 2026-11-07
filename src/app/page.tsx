import Link from "next/link";
import { Fragment, Suspense } from "react";
import { Logo } from "./logo";
import { StartLink, StartNote } from "./start-link";

const STEPS = [
  ["Tell us what they love", "AI finds a few great ideas."],
  ["Keep your favorites", "Pay once with PayPal."],
];

const WAYS = [
  ["Send them a link", "They open and unwrap."],
  ["Give them the card", "They tap and unwrap."],
];

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist font-bold text-action">
      {n}
    </span>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 p-6">
      <Logo className="text-xl" />
      <h1 className="mt-2 text-4xl font-semibold leading-tight">
        A gift they choose, wrapped like a surprise.
      </h1>
      <p className="text-lg text-soft">
        Choose a few gifts with the help of our AI shopper. Let them unwrap each one and keep
        their favorite.
      </p>
      <ol className="flex flex-col gap-4 rounded-2xl border border-line p-5">
        {STEPS.map(([title, detail], index) => (
          <li key={title} className="flex gap-3.5">
            <StepNumber n={index + 1} />
            <span>
              <span className="block font-bold">{title}</span>
              <span className="block text-soft">{detail}</span>
            </span>
          </li>
        ))}
        <li className="flex gap-3.5">
          <StepNumber n={3} />
          <div className="flex w-fit flex-col gap-2">
            {WAYS.map(([title, detail], index) => (
              <Fragment key={title}>
                {index > 0 && (
                  <span className="flex items-center gap-3 text-xs font-bold text-soft">
                    <span className="h-px flex-1 bg-line" aria-hidden="true" />
                    OR
                    <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  </span>
                )}
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-soft">{detail}</span>
                </span>
              </Fragment>
            ))}
          </div>
        </li>
      </ol>
      <div className="flex-1" />
      <Suspense
        fallback={
          <>
            <Link href="/new" className="button text-lg">
              Start a gift
            </Link>
            <StartNote />
          </>
        }
      >
        <StartLink />
      </Suspense>
    </main>
  );
}
