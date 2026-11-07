"use client";

import { useState } from "react";

/** Long text shows its first 5 lines, with a button to read the rest. */
export function MoreText({ text, className }: { text: string; className: string }) {
  const [open, setOpen] = useState(false);
  // About 5 lines on a phone. Shorter text never needs the button.
  const long = text.length > 220;

  return (
    <div className={className}>
      <p className={long && !open ? "line-clamp-5" : ""}>{text}</p>
      {long && (
        <button
          type="button"
          className="mt-1 font-semibold text-action underline"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
