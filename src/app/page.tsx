import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-5xl font-semibold">Tap Gift</h1>
      <p className="text-xl text-soft">Choosing the gift is hard. Unwrapping it shouldn&apos;t be.</p>
      <p>
        Tell us what they love, and AI narrows it down to a few great ideas. They tap the card,
        unwrap each one, and choose. You&apos;re charged only for the one they pick.
      </p>
      <Link href="/new" className="button">
        Create a gift
      </Link>
    </main>
  );
}
