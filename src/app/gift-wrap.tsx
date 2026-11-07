type Tag = {
  recipientName: string;
  /** The smaller version shown in the gifter's preview. */
  small?: boolean;
};

export function Bow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 104" aria-hidden="true" className={className}>
      <path className="bow-ribbon" d="M85 52C62 8 18 2 12 30c-5 24 42 32 73 22Z" />
      <path className="bow-ribbon" d="M85 52c23-44 67-50 73-22 5 24-42 32-73 22Z" />
      <path
        className="bow-knot"
        d="M85 52C66 30 40 24 28 32c16 2 36 12 57 20Zm0 0c19-22 45-28 57-20-16 2-36 12-57 20Z"
      />
      <path className="bow-ribbon" d="M85 56 60 102l17-7 8 9Zm0 0 25 46-17-7-8 9Z" />
      <ellipse className="bow-knot" cx="85" cy="53" rx="12" ry="11" />
    </svg>
  );
}

export function TagString({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 84" aria-hidden="true" className={className}>
      <path className="tag-string" d="M30 2c-14 22 16 38 0 80" />
    </svg>
  );
}

function nameSize(name: string, small: boolean) {
  if (name.length > 14) return small ? "text-xl" : "text-3xl";
  if (name.length > 7) return small ? "text-3xl" : "text-5xl";
  return small ? "text-4xl" : "text-7xl";
}

export function GiftTag({ recipientName, small = false }: Tag) {
  const Name = small ? "p" : "h1";
  return (
    <div
      className={`-rotate-2 rounded-2xl bg-paper text-center shadow-xl ${small ? "w-52 px-3 py-3" : "relative w-full max-w-[16.5rem] px-5 pb-8 pt-11"}`}
    >
      {!small && (
        <span className="absolute left-1/2 top-3.5 size-4 -translate-x-1/2 rounded-full bg-action" />
      )}
      <p className={`font-hand leading-none text-soft ${small ? "text-2xl" : "text-3xl"}`}>To:</p>
      <Name
        className={`mt-1 font-display font-semibold leading-none tracking-tight wrap-anywhere text-ink ${nameSize(recipientName, small)}`}
      >
        {recipientName}
      </Name>
    </div>
  );
}
