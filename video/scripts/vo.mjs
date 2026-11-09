// Generates the voice-over, one file per scene, with the same voice and settings as the opening.
// Usage (from video/): node --env-file=../.env.local scripts/vo.mjs [S2,S3,...], then node scripts/vo-process.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error("Set OPENROUTER_API_KEY in ../.env.local");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public/vo");
mkdirSync(out, { recursive: true });

// Read the lines straight from the timeline so the script and captions never drift apart.
const { SCENES, END_VO, INTRO_VO } = await import(path.join(root, "src/timeline.ts"));
const lines = [...SCENES.map((s) => ({ id: s.id, text: s.vo })), { id: "END", text: END_VO }, { id: "INTRO", text: INTRO_VO }];
const only = process.argv[2]?.split(",");

const durationsFile = path.join(root, "src/vo.json");
const durations = existsSync(durationsFile) ? JSON.parse(readFileSync(durationsFile, "utf8")) : {};

for (const { id, text } of lines) {
  if (only && !only.includes(id)) continue;
  const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "elevenlabs/eleven-v4",
      voice: "chris",
      input: `[upbeat] ${text}`,
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    console.error(`${id}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    continue;
  }
  const raw = path.join(out, `${id}-raw.mp3`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  const final = path.join(out, `${id}.mp3`);
  // Shorten long pauses, then speed up 6%, as in the opening.
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", raw,
    "-af", "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.32:stop_threshold=-45dB,atempo=1.06",
    "-c:a", "libmp3lame", "-q:a", "2", final,
  ]);
  const secs = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final]).toString());
  durations[id] = Math.round(secs * 100) / 100;
  console.log(`${id}: ${secs.toFixed(1)}s`);
}
writeFileSync(durationsFile, JSON.stringify(durations, null, 2) + "\n");
