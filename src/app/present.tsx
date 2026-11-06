type Props = {
  /** Gifts take turns in different wrapping. */
  tone?: number;
  wiggle?: boolean;
  opening?: boolean;
};

const TONES = 4;

export function Present({ tone = 0, wiggle = false, opening = false }: Props) {
  const motion = opening ? "present-opening" : wiggle ? "present-wiggle" : "";
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={`present present-tone-${tone % TONES} ${motion}`}
    >
      <rect className="present-box" x="28" y="88" width="144" height="98" rx="10" />
      <rect className="present-shade" x="28" y="92" width="144" height="10" />
      <rect className="present-ribbon" x="88" y="88" width="24" height="98" />
      <g className="present-lid">
        <rect className="present-top" x="18" y="60" width="164" height="36" rx="8" />
        <rect className="present-ribbon" x="86" y="60" width="28" height="36" />
        <path className="present-ribbon" d="M100 60C74 16 36 24 48 48c7 14 34 15 52 12Z" />
        <path className="present-ribbon" d="M100 60c26-44 64-36 52-12-7 14-34 15-52 12Z" />
        <circle className="present-knot" cx="100" cy="57" r="11" />
      </g>
    </svg>
  );
}
