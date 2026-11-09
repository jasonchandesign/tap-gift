// Generates background music options with Lyria 3 (via OpenRouter), instrumental only.
// Usage (from video/): node --env-file=../.env.local scripts/music.mjs <name> "<style prompt>"
// Writes public/music/<name>.<ext>.
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) throw new Error("Set OPENROUTER_API_KEY in ../.env.local");
const [name, style] = process.argv.slice(2);
const dir = path.resolve(import.meta.dirname, "../public/music");

const prompt = `${style} Instrumental only, no vocals, no singing, no spoken words. It sits under a voice-over in a product demo video, so keep it soft and even: the same gentle groove all the way through, no big build-ups, no drops, no breakdowns, no long silences, and no ending or fade-out. About 2 minutes 45 seconds long.`;

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: process.env.MODEL || "google/lyria-3-pro-preview",
    modalities: ["text", "audio"],
    audio: { format: "mp3" },
    stream: true,
    messages: [{ role: "user", content: prompt }],
  }),
});
if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 500)}`);

// Audio arrives as base64 pieces in the streamed deltas.
const pieces = [];
let format = "mp3";
let cost;
let note = "";
let buf = "";
const decoder = new TextDecoder();
for await (const chunk of res.body) {
  buf += decoder.decode(chunk, { stream: true });
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line.startsWith("data:") || line === "data: [DONE]") continue;
    const j = JSON.parse(line.slice(5));
    if (j.error) throw new Error(JSON.stringify(j.error).slice(0, 500));
    const d = j.choices?.[0]?.delta ?? {};
    if (d.audio?.data) pieces.push(d.audio.data);
    if (d.audio?.format) format = d.audio.format;
    if (d.content) note += d.content;
    if (j.usage?.cost != null) cost = j.usage.cost;
  }
}
if (!pieces.length) throw new Error(`no audio. ${note.slice(0, 500)}`);
const bytes = Buffer.concat(pieces.map((p) => Buffer.from(p, "base64")));
const ext = /wav|pcm/.test(format) ? "wav" : "mp3";
fs.writeFileSync(path.join(dir, `${name}.${ext}`), bytes);
console.log(`${name}.${ext} ${(bytes.length / 1e6).toFixed(1)} MB${cost != null ? ` $${cost}` : ""}${note ? `\n${note.slice(0, 300)}` : ""}`);
