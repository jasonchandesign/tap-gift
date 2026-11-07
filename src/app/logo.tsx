// The box is as tall as the lowercase letters and sits on the baseline, so the
// symbol reads as part of the word. Sizes are in em to scale with the text.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block whitespace-nowrap font-extrabold leading-none tracking-tight ${className}`}>
      <svg
        viewBox="6 9.5 52 50.5"
        className="inline align-baseline text-accent"
        style={{ width: "0.946em", height: "0.919em", marginRight: "0.24em" }}
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M9 30a3 3 0 0 0-3 3v22a5 5 0 0 0 5 5h18.5V30ZM34.5 30v30H53a5 5 0 0 0 5-5V33a3 3 0 0 0-3-3Z"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          d="M24.12 17.34A10 10 0 0 0 22.11 25M17.03 11.8A19 19 0 0 0 13.06 25M39.88 17.34A10 10 0 0 1 41.89 25M46.97 11.8A19 19 0 0 1 50.94 25"
        />
        <circle cx="32" cy="23.5" r="3.8" fill="currentColor" />
      </svg>
      Tap Gift
    </span>
  );
}
