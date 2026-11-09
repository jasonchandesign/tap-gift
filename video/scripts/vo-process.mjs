// Rebuilds the voice-over files from the raw ElevenLabs takes (no regeneration):
// trims silence at the ends, sets the speed, and splits lines that have cues.
// Usage (from video/): node scripts/vo-process.mjs [tempo]   (default 1.0 = natural speed)
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "public/vo");
const tempo = Number(process.argv[2] ?? 1);
const { SCENES, voParts, sentences, END_VO, INTRO_VO } = await import(path.join(root, "src/timeline.ts"));

const run = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args]);
const seconds = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

// Silences inside a file, as [start, end] pairs.
function silences(file) {
  const log = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${file}" -af silencedetect=noise=-40dB:d=0.12 -f null - 2>&1`]).toString();
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return starts.map((s, i) => [s, ends[i] ?? s]).filter(([s, e]) => e > s);
}

const durations = {};
const lines = [...SCENES.map((s) => ({ id: s.id, scene: s })), { id: "END", text: END_VO }, { id: "INTRO", text: INTRO_VO }];

for (const { id, scene } of lines) {
  const raw = path.join(dir, `${id}-raw.mp3`);
  if (!existsSync(raw)) {
    console.log(`${id}: no raw take, skipped`);
    continue;
  }
  const whole = path.join(dir, `${id}.mp3`);
  // Trim silence at both ends only, so the natural pauses between words stay.
  const trimEnds = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse";
  const speed = tempo === 1 ? "" : `,atempo=${tempo}`;
  run(["-i", raw, "-af", trimEnds + speed, "-c:a", "libmp3lame", "-q:a", "2", whole]);
  const total = seconds(whole);
  durations[id] = Math.round(total * 100) / 100;

  const parts = scene ? voParts(scene) : [];
  if (parts.length > 1) {
    // Cut at the pause nearest to where each sentence group ends, by text length.
    const all = sentences(scene.vo);
    const chars = all.map((t) => t.length);
    const totalChars = chars.reduce((a, b) => a + b, 0);
    const gaps = silences(whole);
    let used = 0;
    const cuts = [];
    for (const p of parts.slice(0, -1)) {
      used += sentences(p.text).reduce((a, t) => a + t.length, 0);
      const guess = (used / totalChars) * total;
      const gap = gaps.reduce((best, g) => (Math.abs((g[0] + g[1]) / 2 - guess) < Math.abs((best[0] + best[1]) / 2 - guess) ? g : best), gaps[0] ?? [guess, guess]);
      cuts.push((gap[0] + gap[1]) / 2);
    }
    const bounds = [0, ...cuts, total];
    parts.forEach((p, n) => {
      const out = path.join(dir, `${p.id}.mp3`);
      run(["-i", whole, "-ss", String(bounds[n]), "-to", String(bounds[n + 1]), "-af", trimEnds, "-c:a", "libmp3lame", "-q:a", "2", out]);
      durations[p.id] = Math.round(seconds(out) * 100) / 100;
    });
    console.log(`${id}: ${total.toFixed(1)}s, split at ${cuts.map((c) => c.toFixed(2)).join(", ")}s → ${parts.map((p) => `${p.id} ${durations[p.id]}s`).join(", ")}`);
  } else {
    console.log(`${id}: ${total.toFixed(1)}s`);
  }
}
writeFileSync(path.join(root, "src/vo.json"), JSON.stringify(durations, null, 2) + "\n");
