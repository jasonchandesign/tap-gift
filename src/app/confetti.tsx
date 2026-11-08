import type { CSSProperties } from "react";

const COLORS = ["var(--wrap)", "var(--ribbon)", "var(--accent)", "var(--knot)", "var(--action)"];
// Long strips, short chips, dots and curls, so the shower doesn't look uniform.
const SHAPES = ["strip", "chip", "dot", "curl"] as const;
const PIECES = Array.from({ length: 40 }, (_, index) => index);

/** Plays once when it mounts. */
export function Confetti() {
  return (
    <div aria-hidden="true" className="confetti">
      {PIECES.map((index) => {
        const shape = SHAPES[index % SHAPES.length];
        const color = COLORS[index % COLORS.length];
        return (
          <span
            key={index}
            className={`confetti-${shape}`}
            // Each piece starts a different distance above the screen, so they cross the top edge
            // one by one rather than as a line, and drifts and spins its own way on the way down.
            style={
              {
                left: `${(index * 37) % 100}%`,
                background: shape === "curl" ? undefined : color,
                color,
                animationDelay: `${(index % 9) * 50}ms`,
                animationDuration: `${1300 + (index % 5) * 200}ms`,
                "--start": `${-4 - ((index * 7) % 5) * 3}vh`,
                "--drift": `${((index * 13) % 9) * 10 - 40}px`,
                "--spin": `${(index % 2 ? 1 : -1) * (360 + (index % 4) * 120)}deg`,
              } as CSSProperties
            }
          >
            {shape === "curl" && (
              <svg viewBox="0 0 12 28" className="size-full" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 2c5 3 5 5 0 8s-5 5 0 8 5 5 0 8" />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}
