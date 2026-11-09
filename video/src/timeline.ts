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
      { src: T1, from: 3.0, to: 5.5 },
      { src: T1, from: 5.5, to: 16.5, rate: 1.8 },
    ],
  },
  {
    id: "S3",
    side: "left",
    caption: "Shop with the AI",
    // Intro, then the size line as James picks M, then the preferences line as he types "under $50".
    cues: [
      { at: 0, sentences: 3 },
      { at: 10.1, sentences: 1 },
      { at: 19.0, sentences: 1 },
    ],
    detail: "Browse from unlimited options. Real, in-stock products.",
    vo: "I tell the AI shopper what Sam's into. I can tap an idea or type my own. It searches real, in-stock products and explains each pick. I choose the size as I add things, so Sam only picks colors. I can add a price limit or any other preference by typing it, or with the built-in voice input.",
    pieces: [
      { src: T1, from: 16.5, to: 17.5 },
      { src: T1, from: 22.0, to: 23.5 },
      // AI waits: just the last moment of the typing dots, then the reply.
      { src: T1, from: 41.0, to: 43.0, rate: 4 },
      { src: T1, from: 43.0, to: 44.5 },
      { src: T1, from: 49.0, to: 60.5, rate: 3 },
      { src: T1, from: 64.0, to: 67.0, rate: 4 },
      { src: T1, from: 67.0, to: 68.0 },
      // The Nike jacket's sheet: size M, then Add to cart.
      { src: T1, from: 74.0, to: 81.5, rate: 2.5 },
      { src: T1, from: 82.0, to: 87.5, rate: 2.5 },
      { src: T1, from: 91.0, to: 94.0, rate: 4 },
      { src: T1, from: 94.0, to: 95.0 },
      { src: T1, from: 101.5, to: 103.5 },
      // "Maybe a skate jacket under $50?" (the earlier "Anything cool under $50?" turn is cut).
      { src: T1, from: 141.5, to: 147.0, rate: 2.5 },
      { src: T1, from: 151.0, to: 154.0, rate: 4 },
      { src: T1, from: 154.0, to: 156.5, zoom: { scale: 1.3, x: 0.5, y: 0.45 } },
      { src: T1, from: 163.5, to: 166.5 },
    ],
  },
  {
    id: "S4",
    side: "left",
    caption: "Pay once with PayPal",
    detail: "Enough for the costliest gift, shipping and tax included.",
    vo: "Each gift shows its store, shipping and tax. I pay once with PayPal, enough for the costliest one. The Orders API captures it up front, and the balance comes back once Sam chooses.",
    pieces: [
      { src: T1, from: 166.5, to: 171.5, rate: 1.6 },
      { src: T1, from: 171.5, to: 188.5, rate: 6 },
      // Each gift's price, shipping, tax and store.
      { src: T1, from: 188.5, to: 192.5, zoom: { scale: 1.3, x: 0.5, y: 0.15 } },
      // The charge: costliest gift, shipping and tax, then Pay.
      { src: T1, from: 204.5, to: 209.5, rate: 1.3, zoom: { scale: 1.3, x: 0.5, y: 0.8 } },
      { src: T1, from: 209.5, to: 210.8 },
      // The sandbox login is cut; straight to PayPal's review and Pay.
      { src: T1, from: 239.5, to: 241.0 },
      { src: T1, from: 255.5, to: 259.8, rate: 2 },
      { src: T1, from: 259.8, to: 262.5 },
    ],
  },
  {
    id: "S5",
    side: "right",
    caption: "Hand over the card",
    detail: "The gift lives on the card now.",
    vo: "The gift lives on the card now. I hand it to Sam, and he taps it with his phone. Sam sees instructions to unwrap all three gifts and pick one to keep.",
    // The last line waits for the "Unwrap all 3 / Pick 1 to keep" card (about 1.3 s into the clip).
    cues: [
      { at: 0, sentences: 2 },
      { at: 7.0, sentences: 1 },
    ],
    pieces: [
      // James hands Sam the card (first two-shot take). Cut before the camera drifts at 3.25 s.
      { full: "s5a-handoff-1.mp4", seconds: 3.0 },
      { cardTap: "sam", seconds: 2.6 },
      { src: T2, from: 3.85, to: 9.8 },
    ],
  },
  {
    id: "S6",
    side: "right",
    caption: "Unwrap every surprise",
    detail: "No account. No AI chat on the kid's side.",
    vo: "Sam gets a wrapped present for each gift. No account and no AI chat on his side. Every gift is torn open by hand, and Claude drew each wrapping paper as a clue to what's inside.",
    pieces: [
      { src: T2, from: 9.8, to: 17.0 },
      { src: T2, from: 27.0, to: 35.0 },
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
      // The Instax: Mint Green, Blossom Pink, Mint Green, and the photo follows.
      { src: T2, from: 45.5, to: 52.5, rate: 1.2 },
      { src: T2, from: 52.5, to: 60.0, rate: 1.3 },
      { src: T2, from: 77.5, to: 86.5, rate: 2 },
      { src: T2, from: 93.5, to: 95.5 },
      { src: T2, from: 97.0, to: 112.5, rate: 5 },
      { src: T2, from: 112.5, to: 114.0 },
    ],
  },
  {
    id: "S8",
    side: "left",
    caption: "The difference comes back",
    detail: "Price, shipping and tax come out. PayPal refunds the rest.",
    vo: "Sam picked a cheaper gift. After its price, shipping and tax, PayPal's Payments API refunds the rest automatically. It uses a fixed request ID, so a retry can never refund twice.",
    pieces: [
      { src: T3, from: 1.5, to: 3.2 },
      // The receipt holds still, so play it slowly while the line finishes.
      { src: T3, from: 3.2, to: 10.4, rate: 0.65, zoom: { scale: 1.25, x: 0.5, y: 0.15 } },
    ],
  },
  {
    id: "S9",
    side: "right",
    caption: "Cleared and reused",
    detail: "One card for every occasion.",
    vo: "To be environmentally friendly, the card can be cleared and reused for another gift, for another occasion.",
    pieces: [{ src: T2, from: 114.0, to: 120.5 }],
  },
];

export const END_VO =
  "Tap Gift is built with the PayPal Server SDK, Claude, Channel3 and Render. Judges without a card can try it at tap-gift dot onrender dot com slash c slash demo.";

/** The same line as it should read on screen. */
export const END_CC =
  "Tap Gift is built with the PayPal Server SDK, Claude, Channel3 and Render. Judges without a card can try it at tap-gift.onrender.com/c/demo.";

/** Which address the gray bar shows, by source time. */
export const URLS: Record<string, { from: number; to: number; url: string }[]> = {
  [T1]: [{ from: 210.8, to: 259.8, url: "sandbox.paypal.com" }],
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
