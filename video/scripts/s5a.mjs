// S5a, in two shots: James hands Sam the card (focus on Sam's joy), then Sam reads
// "Tap here" on the back and takes out his phone.
// Usage (from video/):
//   node --env-file=../.env.local scripts/s5a.mjs frames <shot> [take]
//   node --env-file=../.env.local scripts/s5a.mjs video <shot> [take]
// Shots: handoff, phone. Files land in media/video/s5a/<shot>-first-<take>.png etc.
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) throw new Error("Set OPENROUTER_API_KEY in ../.env.local");
const DIR = path.resolve(import.meta.dirname, "../../media/video/s5a");
const auth = { Authorization: `Bearer ${KEY}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dataUrl = (file) => `data:image/png;base64,${fs.readFileSync(path.join(DIR, file)).toString("base64")}`;

const LOOK =
  "Horizontal 16:9 cinematic film still, shot on 35mm, shallow depth of field, natural skin texture, gentle film grain, warm and candid. No text, no captions, no logos, no watermarks, no brand names anywhere.";
const ROOM =
  "The same bright, warm family living room in the afternoon: soft window light, a beige sofa, muted balloons and a small wrapped gift in the background, nothing with writing on it.";
// The card keeps drifting bigger in generated shots, so spell out its real size.
const SIZE =
  "The card is small and rigid, exactly the size of a bank card (8.5 by 5.4 cm): in his hands it is no wider than his four fingers held together, and his fingertips overlap its edges.";
const VIDEO_LOOK =
  "Cinematic, shot on 35mm, shallow depth of field, warm afternoon light in a family living room, candid and natural. Nearly still camera. No text, no logos. Audio: quiet room tone; no music, no speech.";

// Reference images: [james, sam-and-room (from take 1), card front | card back].
const SHOTS = {
  handoff: {
    refs: ["ref-james.png", "first-1.png", "ref-card-front.png"],
    first: `${LOOK} Use the first reference image for James's hair and his plain black crew-neck T-shirt, the second for Sam (a 13-year-old boy with short curly brown hair in a heather-grey hoodie) and for the room and light, and the third for the card's front design exactly (a credit-card-sized kraft-brown card with a cream ribbon cross and bow and a blank To/From tag; keep it bank-card sized). ${ROOM} Over-the-shoulder shot from behind James: James is a soft, out-of-focus dark shape at the left edge of the frame, seen from behind and the side, only the back of his head, his shoulder and his outstretched arm visible, his face not visible. He holds the kraft card out toward Sam. Sam faces the camera, in sharp focus in the centre-right of the frame, eyes wide and mouth open in a delighted, surprised smile, reaching for the card.`,
    last: `${LOOK} Use the first reference image for the scene, the framing, the light and both people exactly: the same over-the-shoulder shot a moment later. James is still at the right edge, seen from behind, his face not visible, his hand lowering. Sam, in sharp focus, holds the card in both hands at chest height, looking down at it with a big, genuinely happy grin. The card's BACK faces the camera and must match the second reference image exactly: the left third is kraft brown with a dashed circle around a small phone icon and "Tap here" under it, the right two thirds are cream with a heading and three short numbered lines. It is not a bank card: no magnetic stripe, no chip, no dark colour. ${SIZE} Same camera position and framing.`,
    lastRefs: (take) => [`handoff-first-${take}.png`, "ref-card-back.png"],
    video:
      `${VIDEO_LOOK} Over-the-shoulder from behind James, who stays a soft out-of-focus shape at the left edge with his face never visible. James holds out a small kraft-brown gift card; Sam, a 13-year-old boy in a grey hoodie, in sharp focus, takes it in both hands, looks down at it and breaks into a big, happy grin. The card stays the size of a bank card, kraft and cream, never dark, with no magnetic stripe. The camera does not move or pan; James stays at the same place at the edge of the frame.`,
    seconds: 4,
  },
  phone: {
    refs: ["first-1.png", "ref-card-back.png"],
    first: `${LOOK} Use the first reference image for Sam (a 13-year-old boy with short curly brown hair in a heather-grey hoodie) and for the room and light. Use the second reference image for the back of the card: kraft brown on the left third with a dashed circle around a small phone icon and "Tap here", cream on the right with three short numbered lines. ${ROOM} Medium close-up on Sam alone, slightly from the side, at chest height: he holds the card in front of his chest with both hands, its back toward the camera so the small "Tap here" circle shows, and reads it with a curious, excited smile. ${SIZE} No phone visible yet.`,
    last: `${LOOK} Use the first reference image for the scene, the framing, the light, Sam and the card exactly: the same shot a few seconds later. Sam holds the card in his left hand and a plain black phone with no logos in his right hand, the top edge of the phone touching the card, watching the phone with an excited smile. The phone's screen faces Sam, away from the camera. ${SIZE} The phone is clearly bigger than the card, about twice its length. Same camera position and framing.`,
    lastRefs: (take) => [`phone-first-${take}.png`, "ref-card-back.png"],
    video:
      `${VIDEO_LOOK} Medium close-up on Sam, a 13-year-old boy in a grey hoodie, holding a small kraft-brown card and reading the "Tap here" on its back. He looks up with a quick, excited smile, pulls a plain black phone out of his hoodie pocket and raises the top edge of the phone to touch the card, watching the phone. The card never flips and stays exactly the size of a bank card, smaller than the phone. The phone screen faces away from the camera. The camera does not move.`,
    seconds: 6,
  },
};

async function draw(prompt, refs, out) {
  const content = [
    ...refs.map((r) => ({ type: "image_url", image_url: { url: dataUrl(r) } })),
    { type: "text", text: prompt },
  ];
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image",
      modalities: ["image", "text"],
      image_config: { aspect_ratio: "16:9" },
      messages: [{ role: "user", content }],
    }),
  });
  const json = await res.json();
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url?.startsWith("data:image")) throw new Error(`no image: ${JSON.stringify(json.error || json.choices?.[0] || json).slice(0, 400)}`);
  fs.writeFileSync(path.join(DIR, out), Buffer.from(url.split(",")[1], "base64"));
  console.log(`[s5a] ${out}${json.usage?.cost != null ? ` $${Number(json.usage.cost).toFixed(3)}` : ""}`);
}

async function video(shot, take) {
  const s = SHOTS[shot];
  const res = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/veo-3.1-fast",
      prompt: s.video,
      duration: s.seconds,
      resolution: "1080p",
      aspect_ratio: "16:9",
      generate_audio: false,
      frame_images: [
        { type: "image_url", image_url: { url: dataUrl(`${shot}-first-${take}.png`) }, frame_type: "first_frame" },
        // FIRST_ONLY=1 lets Veo find its own ending when the drawn last frame is off.
        ...(process.env.FIRST_ONLY
          ? []
          : [{ type: "image_url", image_url: { url: dataUrl(`${shot}-last-${take}.png`) }, frame_type: "last_frame" }]),
      ],
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`video: HTTP ${res.status} ${body.slice(0, 500)}`);
  const { id } = JSON.parse(body);
  console.log(`[s5a] ${shot} video job ${id}`);
  for (;;) {
    await sleep(10000);
    const j = await (await fetch(`https://openrouter.ai/api/v1/videos/${id}`, { headers: auth })).json();
    if (j.status === "completed") {
      const v = await fetch(`https://openrouter.ai/api/v1/videos/${id}/content?index=0`, { headers: auth });
      fs.writeFileSync(path.join(DIR, `${shot}-${take}.mp4`), Buffer.from(await v.arrayBuffer()));
      console.log(`[s5a] ${shot}-${take}.mp4${j.usage?.cost != null ? ` $${Number(j.usage.cost).toFixed(2)}` : ""}`);
      return;
    }
    if (["failed", "cancelled", "expired"].includes(j.status)) throw new Error(`video ${j.status}: ${JSON.stringify(j.error || "").slice(0, 300)}`);
  }
}

const [step, shot, take = "1"] = process.argv.slice(2);
const s = SHOTS[shot];
if (!s) {
  console.log(`usage: s5a.mjs frames|video <${Object.keys(SHOTS).join("|")}> [take]`);
} else if (step === "frames") {
  await draw(s.first, s.refs, `${shot}-first-${take}.png`);
  await draw(s.last, s.lastRefs(take), `${shot}-last-${take}.png`);
} else if (step === "shrink") {
  // Redraw take <take>'s stills with a smaller card, into take <take>s.
  const edit = (from) =>
    `Edit this image. Make the small kraft card about 30% smaller than it is now, so it looks like a real bank card (8.5 by 5.4 cm) in his hands: shrink only the card, keep its design, angle and position in the hand, and adjust the fingers holding it naturally. Keep everything else exactly the same: the people, faces, expressions, clothes, the phone if there is one (the phone stays its current size), the room, the light, the framing and the colours. Do not add any text, logos or anything new.`;
  for (const part of ["first", "last"]) {
    await draw(edit(part), [`${shot}-${part}-${take}.png`], `${shot}-${part}-${take}s.png`);
  }
} else if (step === "last") {
  // Keep an existing first frame and redraw only the last one.
  await draw(s.last, s.lastRefs(take), `${shot}-last-${take}.png`);
} else if (step === "video") {
  await video(shot, take);
}
