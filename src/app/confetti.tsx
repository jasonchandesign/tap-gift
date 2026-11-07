const COLORS = ["var(--wrap)", "var(--ribbon)", "var(--accent)", "var(--knot)", "var(--action)"];
const PIECES = Array.from({ length: 36 }, (_, index) => index);

/** Plays once when it mounts. */
export function Confetti() {
  return (
    <div aria-hidden="true" className="confetti">
      {PIECES.map((index) => (
        <span
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            background: COLORS[index % COLORS.length],
            animationDelay: `${(index % 9) * 45}ms`,
            animationDuration: `${1300 + (index % 5) * 220}ms`,
          }}
        />
      ))}
    </div>
  );
}
