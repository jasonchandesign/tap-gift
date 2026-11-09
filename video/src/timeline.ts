// The edit, as data. Times are seconds in the source take; rate speeds a piece up.
export const FPS = 30;

export type Clip = {
  src: string;
  from: number;
  to: number;
  rate?: number;
  /** Zoom into the phone: scale and the point to zoom on, as fractions of the screen. */
  zoom?: { scale: number; x: number; y: number };
};

export type Piece =
  | Clip
  | { cardTap: "gifter" | "sam"; seconds: number }
  /** A full-frame live-action shot, played instead of the phone, from `from` seconds in. */
  | { full: string; seconds: number; from?: number };

export type Scene = {
  id: string;
  side: "left" | "right";
  /** Short caption next to the phone. */
  caption: string;
  /** Smaller line under the caption. */
  detail?: string;
  /** The voice-over line, also shown as closed captions. */
  vo: string;
  /**
   * When each part of the voice-over starts, in seconds into the scene, and how many
   * sentences it covers. Lets a line wait for its moment (no spoilers). Default: all at once.
   */
  cues?: { at: number; sentences: number }[];
  pieces: Piece[];
};

const T1 = "take1-gifter-S2-S4.mp4";
const T2 = "take2-sam-S5-S9.mp4";
const T3 = "take3-gifter-S8.mp4";

/** Background music (public/music), played under everything at a low, even level. */
export const MUSIC = { src: "music/a-acoustic.mp3", volume: 0.08 };

/** The title card before the opening, and its line. */
export const INTRO_SECONDS = 5;
export const INTRO_VO = "Today, we introduce Tap Gift. It's a gift they get to choose.";

export const OPENING = { src: "opening-s1.mp4", seconds: 11.8 };
export const END_CARD_SECONDS = 12;

export const SCENES: Scene[] = [
  {
    id: "S2",
    side: "left",
    caption: "Tap a blank card",
    detail: "No app. The card holds one permanent link.",
    vo: "Every Tap Gift card holds one permanent link. Tap a blank one and you start a gift that lives on that card. There's no app to install.",
    pieces: [
      { cardTap: "gifter", seconds: 2.6 },
      { src: T1, from: 3.0, to: 6.0 },
      { src: T1, from: 6.0, to: 16.0, rate: 1.8 },
    ],
  },
  {
    id: "S3",
    side: "left",
    caption: "Shop with the AI",
    // Intro, then the size line as James picks M, then the preferences line as he types "under $50".
    cues: [
      { at: 0, sentences: 3 },
      { at: 9.0, sentences: 1 },
      { at: 16.6, sentences: 1 },
    ],
    detail: "Browse from unlimited options. Real, in-stock products.",
    vo: "I tell the AI shopper what Sam's into. I can tap an idea or type my own. It searches real, in-stock products and explains each pick. I choose the size as I add things, so Sam only picks colors. I can add a price limit or any other preference by typing it, or with the built-in voice input.",
    pieces: [
      { src: T1, from: 16.0, to: 17.0 },
      { src: T1, from: 23.5, to: 25.0 },
      // AI waits: just the last moment of the typing dots, then the reply.
      { src: T1, from: 38.0, to: 40.0, rate: 4 },
      { src: T1, from: 40.0, to: 41.5 },
      { src: T1, from: 53.5, to: 60.0, rate: 2.5 },
      { src: T1, from: 64.0, to: 66.0, rate: 4 },
      { src: T1, from: 66.0, to: 67.0 },
      { src: T1, from: 75.5, to: 82.5, rate: 2.2 },
      { src: T1, from: 83.5, to: 88.5, rate: 2.5 },
      { src: T1, from: 93.0, to: 95.0, rate: 4 },
      { src: T1, from: 95.0, to: 96.0 },
      { src: T1, from: 105.5, to: 107.0 },
      { src: T1, from: 110.5, to: 115.5, rate: 2.5 },
      { src: T1, from: 122.0, to: 124.0, rate: 4 },
      { src: T1, from: 124.0, to: 127.0, zoom: { scale: 1.3, x: 0.5, y: 0.45 } },
      { src: T1, from: 150.0, to: 153.0 },
    ],
  },
  {
    id: "S4",
    side: "left",
    caption: "Pay once with PayPal",
    detail: "Orders API captures the priciest gift up front.",
    vo: "I keep a few options at different prices and pay once with PayPal, for the priciest one. The Orders API captures the payment up front, and the balance comes back once Sam chooses.",
    pieces: [
      { src: T1, from: 153.5, to: 158.8, rate: 1.6 },
      { src: T1, from: 158.8, to: 176.5, rate: 6 },
      { src: T1, from: 179.8, to: 183.5, zoom: { scale: 1.3, x: 0.5, y: 0.78 } },
      { src: T1, from: 192.0, to: 195.5, rate: 2 },
      { src: T1, from: 196.5, to: 197.5 },
      { src: T1, from: 208.0, to: 212.0, rate: 2.5 },
      { src: T1, from: 212.0, to: 215.0 },
    ],
  },
  {
    id: "S5",
    side: "right",
    caption: "Hand over the card",
    detail: "The gift lives on the card now.",
    vo: "The gift lives on the card now. I hand it to Sam, and he taps it with his phone. Sam sees instructions to unwrap all three gifts and pick one to keep.",
    // The last line waits for the "Unwrap all 3 / Pick 1 to keep" card (about 2 s into the clip).
    cues: [
      { at: 0, sentences: 2 },
      { at: 7.4, sentences: 1 },
    ],
    pieces: [
      // James hands Sam the card (first two-shot take). Cut before the camera drifts at 3.25 s.
      { full: "s5a-handoff-1.mp4", seconds: 3.0 },
      { cardTap: "sam", seconds: 2.6 },
      { src: T2, from: 8.0, to: 14.5 },
    ],
  },
  {
    id: "S6",
    side: "right",
    caption: "Unwrap every surprise",
    detail: "No account. No AI chat on the kid's side.",
    vo: "Sam gets a wrapped present for each gift. No account and no AI chat on his side. Every gift is torn open by hand, and Claude drew each wrapping paper as a clue to what's inside.",
    pieces: [
      { src: T2, from: 14.5, to: 21.0 },
      { src: T2, from: 29.0, to: 37.5 },
    ],
  },
  {
    id: "S7",
    side: "right",
    caption: "Try colors, keep one",
    // Don't name the yellow jacket until all three are open (the "Pick 1 to keep" screen).
    cues: [
      { at: 0, sentences: 1 },
      { at: 12.4, sentences: 1 },
    ],
    detail: "Then send a thank-you.",
    vo: "After each one, Sam can flip through the colors, and the photo changes with them. Once everything's open, he keeps his favorite, the yellow skate jacket, and sends Uncle James a thank-you.",
    pieces: [
      { src: T2, from: 44.0, to: 56.5, rate: 1.7 },
      { src: T2, from: 56.5, to: 63.0, rate: 1.3 },
      { src: T2, from: 76.0, to: 84.5, rate: 2 },
      { src: T2, from: 91.5, to: 93.5 },
      { src: T2, from: 97.5, to: 111.5, rate: 5 },
      { src: T2, from: 111.5, to: 113.0 },
    ],
  },
  {
    id: "S8",
    side: "left",
    caption: "The difference comes back",
    detail: "PayPal Payments API refund, with a fixed request ID.",
    vo: "Sam picked a cheaper gift, so PayPal's Payments API refunds the difference automatically. It uses a fixed request ID, so a retry can never refund twice.",
    pieces: [
      { src: T3, from: 6.6, to: 7.95 },
      // The refund page only appears at the very end of the take, so hold it.
      { src: T3, from: 7.95, to: 8.15, rate: 0.02, zoom: { scale: 1.22, x: 0.5, y: 0 } },
    ],
  },
  {
    id: "S9",
    side: "right",
    caption: "Cleared and reused",
    detail: "One card for every occasion.",
    vo: "To be environmentally friendly, the card can be cleared and reused for another gift, for another occasion.",
    pieces: [{ src: T2, from: 113.0, to: 119.5 }],
  },
];

export const END_VO =
  "Tap Gift is built with the PayPal Server SDK, Claude, Channel3 and Render. Judges without a card can try it at tap-gift dot onrender dot com slash c slash demo.";

/** The same line as it should read on screen. */
export const END_CC =
  "Tap Gift is built with the PayPal Server SDK, Claude, Channel3 and Render. Judges without a card can try it at tap-gift.onrender.com/c/demo.";

/** Which address the gray bar shows, by source time. */
export const URLS: Record<string, { from: number; to: number; url: string }[]> = {
  [T1]: [{ from: 194.3, to: 211.6, url: "sandbox.paypal.com" }],
};
export const DARK_BAR: Record<string, boolean> = { [T2]: true };

export function sentences(text: string) {
  // Split at the end of a sentence, not at the dots inside a web address.
  return text.match(/.+?[.!?](?=\s|$)/g)?.map((t) => t.trim()) ?? [text];
}

/** A scene's voice-over parts: start (s), text, and audio file id. */
export function voParts(scene: Scene) {
  const all = sentences(scene.vo);
  const cues = scene.cues ?? [{ at: 0, sentences: all.length }];
  let i = 0;
  return cues.map((c, n) => {
    const text = all.slice(i, i + c.sentences).join(" ");
    i += c.sentences;
    return { at: c.at, text, id: cues.length > 1 ? `${scene.id}-${n + 1}` : scene.id };
  });
}

export function pieceFrames(p: Piece) {
  if ("cardTap" in p || "full" in p) return Math.round(p.seconds * FPS);
  return Math.round(((p.to - p.from) / (p.rate ?? 1)) * FPS);
}
export function sceneFrames(s: Scene) {
  return s.pieces.reduce((n, p) => n + pieceFrames(p), 0);
}
export function totalFrames() {
  return (
    INTRO_SECONDS * FPS +
    Math.round(OPENING.seconds * FPS) +
    SCENES.reduce((n, s) => n + sceneFrames(s), 0) +
    END_CARD_SECONDS * FPS
  );
}
