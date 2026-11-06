const COLORS = ["#b3263e", "#e3a12f", "#1f5c4a", "#5b3a7a", "#f28c6a"];
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
