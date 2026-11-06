import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-5xl font-semibold">Tap Gift</h1>
      <p className="text-xl text-soft">Give money. Let them choose. Keep a say.</p>
      <p>
        Set a budget and a note. The kid picks with an AI shopper, inside your rules. A parent
        approves before anything is charged.
      </p>
      <Link href="/new" className="button">
        Create a gift
      </Link>
    </main>
  );
}
