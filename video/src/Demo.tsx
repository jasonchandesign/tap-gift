import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  Clip,
  DARK_BAR,
  END_CARD_SECONDS,
  END_CC,
  FPS,
  OPENING,
  INTRO_SECONDS,
  MUSIC,
  totalFrames,
  INTRO_VO,
  Piece,
  pieceFrames,
  Scene,
  sceneFrames,
  SCENES,
  voParts,
  URLS,
} from "./timeline";
import VO from "./vo.json";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily: INTER } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

/** The Tap Gift mark from the site (src/app/logo.tsx): gift box with NFC waves, then the word mark. */
const Logo: React.FC<{ size: number; color?: string }> = ({ size, color = "#fbf6ec" }) => (
  <div style={{ display: "flex", alignItems: "baseline", fontFamily: INTER, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: "-0.025em", color, whiteSpace: "nowrap" }}>
    <svg viewBox="6 9.5 52 50.5" style={{ width: "0.946em", height: "0.919em", marginRight: "0.24em" }} aria-hidden="true">
      <path fill="currentColor" d="M9 30a3 3 0 0 0-3 3v22a5 5 0 0 0 5 5h18.5V30ZM34.5 30v30H53a5 5 0 0 0 5-5V33a3 3 0 0 0-3-3Z" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        d="M24.12 17.34A10 10 0 0 0 22.11 25M17.03 11.8A19 19 0 0 0 13.06 25M39.88 17.34A10 10 0 0 1 41.89 25M46.97 11.8A19 19 0 0 1 50.94 25"
      />
      <circle cx="32" cy="23.5" r="3.8" fill="currentColor" />
    </svg>
    Tap Gift
  </div>
);

const voSeconds = (id: string) => (VO as Record<string, number>)[id];
const VO_START = 8; // frames into a scene before the line starts

// Colors and type that match the app and the printed card.
const KRAFT = "#b8875a";
const KRAFT_DARK = "#8f6640";
const CREAM = "#fbf6ec";
const INK = "#2b1d12";
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '-apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

// The phone screen recordings are 1206×2622.
const SRC_W = 1206;
const SRC_H = 2622;
const SCREEN_H = 930;
const SCALE = SCREEN_H / SRC_H;
const SCREEN_W = SRC_W * SCALE;
const BEZEL = 13;
const PHONE_W = SCREEN_W + BEZEL * 2;
const PHONE_H = SCREEN_H + BEZEL * 2;
const PHONE_X = { left: 560, right: 1360 }; // phone center
const TEXT_X = { left: 980, right: 170 }; // caption column left edge
const TEXT_W = 760;

// Safari's address bar, in screen pixels.
const BAR = { x: 268, y: 2374, w: 670, h: 148 };

const OPENING_FRAMES = Math.round(OPENING.seconds * FPS);
const SLIDE_FRAMES = 18;

type Placed = { scene: Scene; start: number; frames: number; index: number };
const PLACED: Placed[] = (() => {
  let at = OPENING_FRAMES;
  return SCENES.map((scene, index) => {
    const placed = { scene, start: at, frames: sceneFrames(scene), index };
    at += placed.frames;
    return placed;
  });
})();
const END_START = PLACED[PLACED.length - 1].start + PLACED[PLACED.length - 1].frames;

const ease = Easing.bezier(0.33, 0, 0.2, 1);

export const Demo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: KRAFT, fontFamily: SANS }}>
      <Audio
        src={staticFile(MUSIC.src)}
        volume={(f) => MUSIC.volume * interpolate(f, [0, FPS, totalFrames() - 2.5 * FPS, totalFrames()], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <Sequence durationInFrames={INTRO_FRAMES}>
        <Intro />
      </Sequence>
      <Sequence from={INTRO_FRAMES}>
        <Main />
      </Sequence>
    </AbsoluteFill>
  );
};

const INTRO_FRAMES = INTRO_SECONDS * FPS;

/** Everything after the title card: the opening, S2–S9 and the end card. */
const Main: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={OPENING_FRAMES}>
        <OffthreadVideo src={staticFile(OPENING.src)} />
      </Sequence>
      <Sequence from={OPENING_FRAMES} durationInFrames={END_START - OPENING_FRAMES}>
        <Stage />
      </Sequence>
      <Sequence from={END_START} durationInFrames={END_CARD_SECONDS * FPS}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

/** The kraft background, the phone and the caption column for S2–S9. */
const Stage: React.FC = () => {
  const frame = useCurrentFrame() + OPENING_FRAMES;
  const current = PLACED.find((p) => frame >= p.start && frame < p.start + p.frames) ?? PLACED[0];
  const previous = PLACED[current.index - 1];
  const into = frame - current.start;

  // The phone slides across when the scene changes sides, and rises in at the start.
  const fromX = PHONE_X[previous?.scene.side ?? current.scene.side];
  const toX = PHONE_X[current.scene.side];
  const slide = interpolate(into, [0, SLIDE_FRAMES], [0, 1], { extrapolateRight: "clamp", easing: ease });
  const cx = fromX + (toX - fromX) * slide;
  const rise = current.index === 0 ? interpolate(into, [0, 20], [700, 0], { extrapolateRight: "clamp", easing: ease }) : 0;

  // Zoom, if the clip on screen asks for one.
  const { piece, pieceStart, index } = pieceAt(current, into);
  const zoom = piece && "src" in piece ? piece.zoom : undefined;
  // Neighbouring pieces with a zoom stay zoomed across the cut.
  const zoomed = (i: number) => {
    const p = current.scene.pieces[i];
    return !!p && "src" in p && !!p.zoom;
  };
  const zIn = zoom && !zoomed(index - 1) ? interpolate(into - pieceStart, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: ease }) : 1;
  const zOut = zoom && !zoomed(index + 1) ? interpolate(into - pieceStart, [pieceFrames(piece!) - 12, pieceFrames(piece!)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }) : 1;
  const z = zoom ? Math.min(zIn, zOut) : 0;
  const scale = 1 + ((zoom?.scale ?? 1) - 1) * z;

  return (
    <AbsoluteFill>
      <Backdrop />
      {PLACED.map((p) => (
        <Sequence key={p.scene.id} from={p.start - OPENING_FRAMES} durationInFrames={p.frames}>
          <CaptionColumn scene={p.scene} frames={p.frames} />
          {voParts(p.scene).map((part) =>
            voSeconds(part.id) ? (
              <Sequence key={part.id} from={VO_START + Math.round(part.at * FPS)}>
                <Audio src={staticFile(`vo/${part.id}.mp3`)} />
              </Sequence>
            ) : null,
          )}
        </Sequence>
      ))}
      <div
        style={{
          position: "absolute",
          left: cx - PHONE_W / 2,
          top: (1080 - PHONE_H) / 2 + rise,
          width: PHONE_W,
          height: PHONE_H,
          transform: `scale(${scale})`,
          transformOrigin: zoom ? `${zoom.x * 100}% ${zoom.y * 100}%` : "50% 50%",
        }}
      >
        <PhoneFrame>
          {PLACED.map((p) => (
            <Sequence key={p.scene.id} from={p.start - OPENING_FRAMES} durationInFrames={p.frames}>
              <ScenePieces scene={p.scene} />
            </Sequence>
          ))}
        </PhoneFrame>
      </div>
      {PLACED.map((p) => (
        <Sequence key={p.scene.id + "full"} from={p.start - OPENING_FRAMES} durationInFrames={p.frames}>
          <FullShots scene={p.scene} />
        </Sequence>
      ))}
      {/* The card sits in front of the phone while it's being tapped. */}
      {PLACED.map((p) => (
        <Sequence key={p.scene.id + "card"} from={p.start - OPENING_FRAMES} durationInFrames={p.frames}>
          <CardOverPhone scene={p.scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

function pieceAt(p: Placed, into: number) {
  let at = 0;
  for (const [index, piece] of p.scene.pieces.entries()) {
    const n = pieceFrames(piece);
    if (into < at + n) return { piece, pieceStart: at, index };
    at += n;
  }
  return { piece: undefined, pieceStart: 0, index: -1 };
}

const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(120% 90% at 50% 40%, #c4946a 0%, ${KRAFT} 55%, ${KRAFT_DARK} 100%)`,
    }}
  >
    {/* Fine vertical lines, like the kraft paper on the card. */}
    <AbsoluteFill
      style={{
        backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,.035) 0 2px, transparent 2px 9px)",
      }}
    />
  </AbsoluteFill>
);

const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: PHONE_W,
      height: PHONE_H,
      borderRadius: 66,
      background: "#111",
      padding: BEZEL,
      boxSizing: "border-box",
      boxShadow: "0 40px 80px rgba(40,20,5,.45), 0 0 0 2px #3a3a3a inset, 0 0 0 1px #000",
    }}
  >
    <div
      style={{
        position: "relative",
        width: SCREEN_W,
        height: SCREEN_H,
        borderRadius: 54,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {children}
    </div>
  </div>
);

const ScenePieces: React.FC<{ scene: Scene }> = ({ scene }) => {
  let at = 0;
  return (
    <>
      {scene.pieces.map((piece, i) => {
        const n = pieceFrames(piece);
        const from = at;
        at += n;
        return (
          <Sequence key={i} from={from} durationInFrames={n}>
            {"src" in piece ? <ClipView clip={piece} /> : "cardTap" in piece ? <HomeTap who={piece.cardTap} frames={n} /> : <Img src={staticFile("home-sam.png")} style={{ width: SCREEN_W, height: SCREEN_H }} />}
          </Sequence>
        );
      })}
    </>
  );
};

const ClipView: React.FC<{ clip: Clip }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const rate = clip.rate ?? 1;
  const sourceTime = clip.from + (frame / FPS) * rate;
  const url = (URLS[clip.src] ?? []).find((u) => sourceTime >= u.from && sourceTime < u.to)?.url ?? "tap-gift.onrender.com";
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(clip.src)}
        trimBefore={Math.round(clip.from * FPS)}
        playbackRate={rate}
        muted
        style={{ width: SCREEN_W, height: SCREEN_H }}
      />
      <AddressBar url={url} dark={!!DARK_BAR[clip.src]} />
      {rate >= 3 && (clip.to - clip.from) / rate >= 1.5 ? <SpeedBadge rate={rate} /> : null}
    </AbsoluteFill>
  );
};

/** Covers Safari's orange "automated" address bar with its normal look. */
const AddressBar: React.FC<{ url: string; dark: boolean }> = ({ url, dark }) => {
  const fg = dark ? "#ffffff" : "#1c1c1e";
  return (
    <div
      style={{
        position: "absolute",
        left: BAR.x * SCALE,
        top: BAR.y * SCALE,
        width: BAR.w * SCALE,
        height: BAR.h * SCALE,
        borderRadius: (BAR.h * SCALE) / 2,
        background: dark ? "rgba(58,64,92,0.96)" : "rgba(243,243,245,0.98)",
        boxShadow: dark ? "0 0 0 0.5px rgba(255,255,255,.18)" : "0 1px 6px rgba(0,0,0,.12), 0 0 0 0.5px rgba(0,0,0,.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        boxSizing: "border-box",
        color: fg,
        fontFamily: SANS,
      }}
    >
      <svg width="15" height="12" viewBox="0 0 15 12">
        <path d="M1 1.5h13M1 6h10M1 10.5h7" stroke={fg} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 13.5, fontWeight: 500, letterSpacing: -0.1 }}>{url}</span>
      <svg width="14" height="14" viewBox="0 0 16 16">
        <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3" stroke={fg} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

const SpeedBadge: React.FC<{ rate: number }> = ({ rate }) => (
  <div
    style={{
      position: "absolute",
      top: 62,
      right: 14,
      padding: "3px 9px",
      borderRadius: 999,
      background: "rgba(43,29,18,.78)",
      color: CREAM,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: 0.3,
    }}
  >
    {rate}× ▸▸
  </div>
);

// The card-tap moment, played on the home screen before Safari opens.
const TOUCH = 34; // frame the card meets the phone
const BANNER_IN = 44;
const BANNER_TAP = 66;

const HomeTap: React.FC<{ who: "gifter" | "sam"; frames: number }> = ({ who, frames }) => {
  const f = useCurrentFrame();
  const bannerY = interpolate(f, [BANNER_IN, BANNER_IN + 10], [-120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const bannerGone = interpolate(f, [BANNER_TAP + 4, BANNER_TAP + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Safari springs open from the banner, like iOS: a quick zoom, no slow fade.
  const open = interpolate(f, [BANNER_TAP + 2, BANNER_TAP + 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0.9, 0.25, 1) });
  return (
    <AbsoluteFill>
      <Img src={staticFile("home-sam.png")} style={{ width: SCREEN_W, height: SCREEN_H }} />
      {/* Screenshots leave out the camera cutout that recordings show. */}
      <div style={{ position: "absolute", left: SCREEN_W / 2 - 54, top: 11, width: 108, height: 32, borderRadius: 16, background: "#000" }} />
      <AbsoluteFill style={{ alignItems: "center" }}>
        <div
          style={{
            marginTop: 52 + bannerY,
            width: SCREEN_W - 22,
            borderRadius: 20,
            background: "rgba(246,246,248,.93)",
            boxShadow: "0 8px 24px rgba(0,0,0,.22)",
            display: "flex",
            gap: 10,
            padding: "10px 12px",
            alignItems: "center",
            opacity: f < BANNER_IN ? 0 : bannerGone,
            fontFamily: SANS,
            color: "#111",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "linear-gradient(#5ac8fa,#1d7bf2)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="1.8" />
              <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="#fff" strokeWidth="1.4" />
            </svg>
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Website NFC Tag</div>
            <div style={{ fontSize: 14 }}>Open “tap-gift.onrender.com” in Safari</div>
          </div>
        </div>
      </AbsoluteFill>
      <TapCircle at={BANNER_TAP} x={SCREEN_W / 2} y={90} />
      <NfcRings at={TOUCH} />
      {f >= BANNER_TAP + 2 ? (
        <div
          style={{
            position: "absolute",
            left: interpolate(open, [0, 1], [11, 0]),
            top: interpolate(open, [0, 1], [52, 0]),
            width: interpolate(open, [0, 1], [SCREEN_W - 22, SCREEN_W]),
            height: interpolate(open, [0, 1], [56, SCREEN_H]),
            borderRadius: interpolate(open, [0, 1], [20, 48]),
            background: "#fff",
            opacity: interpolate(open, [0, 0.25], [0.6, 1], { extrapolateRight: "clamp" }),
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const TapCircle: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const f = useCurrentFrame() - at;
  if (f < 0 || f > 16) return null;
  const s = interpolate(f, [0, 5, 16], [0.5, 1, 1.3]);
  const o = interpolate(f, [0, 4, 10, 16], [0, 1, 1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 21,
        top: y - 21,
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "rgba(30,30,30,.28)",
        border: "3px solid rgba(255,255,255,.92)",
        boxShadow: "0 2px 10px rgba(0,0,0,.25)",
        transform: `scale(${s})`,
        opacity: o,
      }}
    />
  );
};

/** Little waves from the top of the phone when the card is read. */
const NfcRings: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame() - at;
  if (f < 0 || f > 24) return null;
  return (
    <>
      {[0, 6].map((d) => {
        const t = f - d;
        if (t < 0) return null;
        return (
          <div
            key={d}
            style={{
              position: "absolute",
              left: SCREEN_W / 2 - 40,
              top: -40,
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,.85)",
              transform: `scale(${interpolate(t, [0, 18], [0.4, 2.2])})`,
              opacity: interpolate(t, [0, 18], [0.9, 0], { extrapolateRight: "clamp" }),
            }}
          />
        );
      })}
    </>
  );
};

/** Full-frame live-action shots inside a scene, with the scene's captions over them. */
const FullShots: React.FC<{ scene: Scene }> = ({ scene }) => {
  let at = 0;
  return (
    <>
      {scene.pieces.map((piece, i) => {
        const n = pieceFrames(piece);
        const from = at;
        at += n;
        if (!("full" in piece)) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={n}>
            <FullShot
              src={piece.full}
              trim={Math.round((piece.from ?? 0) * FPS)}
              frames={n}
              fadeIn={i === 0}
              fadeOut={!("full" in (scene.pieces[i + 1] ?? {}))}
              vo={scene.vo}
              voStart={from}
              voFrames={voSeconds(scene.id) ? VO_START + voSeconds(scene.id) * FPS + 6 : n}
            />
          </Sequence>
        );
      })}
    </>
  );
};

const FullShot: React.FC<{
  src: string;
  trim: number;
  frames: number;
  fadeIn: boolean;
  fadeOut: boolean;
  vo: string;
  /** Where this shot starts within the scene, so captions keep the scene's timing. */
  voStart: number;
  voFrames: number;
}> = ({ src, trim, frames, fadeIn, fadeOut, vo, voStart, voFrames }) => {
  const f = useCurrentFrame();
  // Fade in from the stage, cut between shots, and a quick cut back to the phone.
  const inO = fadeIn ? interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const outO = fadeOut ? interpolate(f, [frames - 3, frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return (
    <AbsoluteFill style={{ opacity: Math.min(inO, outO), background: "#000" }}>
      <OffthreadVideo src={staticFile(src)} trimBefore={trim} muted style={{ width: 1920, height: 1080, objectFit: "cover" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 56 }}>
        <Sequence from={-voStart} layout="none">
          <ClosedCaptions text={vo} frames={voFrames} hold={voStart + frames} center />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The kraft card sliding up to the top of the phone, drawn over the phone. */
const CardOverPhone: React.FC<{ scene: Scene }> = ({ scene }) => {
  const sceneFrame = useCurrentFrame();
  let start = 0;
  let tap: Piece | undefined;
  for (const p of scene.pieces) {
    if ("cardTap" in p) {
      tap = p;
      break;
    }
    start += pieceFrames(p);
  }
  if (!tap) return null;
  const f = sceneFrame - start;
  const n = pieceFrames(tap);
  if (f < 0 || f >= n) return null;
  const cx = PHONE_X[scene.side];
  const phoneTop = (1080 - PHONE_H) / 2;
  const cardW = 380;
  const cardH = cardW / 1.59;
  // In from above, touch the top edge of the phone, then lift away before the banner drops.
  const touchY = phoneTop - cardH + 16;
  const y = interpolate(f, [0, TOUCH, TOUCH + 8, BANNER_IN + 2], [-cardH - 80, touchY, touchY, -cardH - 140], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rot = interpolate(f, [0, TOUCH, BANNER_IN + 2], [-14, -3, 6], { extrapolateRight: "clamp" });
  return (
    <Img
      src={staticFile("card-front.png")}
      style={{
        position: "absolute",
        left: cx - cardW / 2 + 30,
        top: y,
        width: cardW,
        height: cardH,
        borderRadius: 16,
        transform: `rotate(${rot}deg)`,
        boxShadow: "0 24px 50px rgba(40,20,5,.45)",
      }}
    />
  );
};

/** Caption, detail line and closed captions, on the side away from the phone. */
const CaptionColumn: React.FC<{ scene: Scene; frames: number }> = ({ scene, frames }) => {
  const f = useCurrentFrame();
  const fade = interpolate(f, [4, 18, frames - 8, frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shift = interpolate(f, [4, 18], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <div
      style={{
        position: "absolute",
        left: TEXT_X[scene.side],
        top: 0,
        width: TEXT_W,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity: fade,
        transform: `translateY(${shift}px)`,
        color: CREAM,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, opacity: 0.75, textTransform: "uppercase" }}>
        {scene.side === "left" ? "Uncle James" : "Sam, 13"}
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 76, lineHeight: 1.05, fontWeight: 700, marginTop: 14, textShadow: "0 2px 12px rgba(60,30,5,.25)" }}>
        {scene.caption}
      </div>
      {scene.detail ? <div style={{ fontSize: 30, lineHeight: 1.35, marginTop: 20, opacity: 0.92 }}>{scene.detail}</div> : null}
      <CueCaptions scene={scene} frames={frames} />
    </div>
  );
};

/** Captions for each voice-over part, each starting at its cue. */
const CueCaptions: React.FC<{ scene: Scene; frames: number }> = ({ scene, frames }) => {
  const parts = voParts(scene);
  return (
    <div style={{ minHeight: 140 }}>
      {parts.map((part, n) => {
        const from = VO_START + Math.round(part.at * FPS);
        const next = n + 1 < parts.length ? VO_START + Math.round(parts[n + 1].at * FPS) : frames;
        const window = Math.max(1, next - from);
        const spoken = voSeconds(part.id) ? Math.round(voSeconds(part.id) * FPS) + 6 : window;
        return (
          <Sequence key={part.id} from={from} durationInFrames={window} layout="none">
            <ClosedCaptions text={part.text} start={0} frames={Math.min(window, spoken)} hold={window} />
          </Sequence>
        );
      })}
    </div>
  );
};

/** Shows the voice-over a sentence at a time, timed by length. */
const ClosedCaptions: React.FC<{ text: string; frames: number; start?: number; hold?: number; center?: boolean }> = ({ text, frames, start = VO_START, hold, center }) => {
  const f = useCurrentFrame();
  // Split at the end of a sentence, not at the dots inside a web address.
  const lines = text.match(/.+?[.!?](?=\s|$)/g)?.map((s) => s.trim()) ?? [text];
  // About 15 characters a second, the pace of the voice-over.
  const lengths = lines.map((l) => Math.max(24, (l.length / 15) * FPS));
  const total = lengths.reduce((a, b) => a + b, 0);
  const squeeze = Math.min(1, (frames - start - 6) / total);
  let at = start;
  const spans = lengths.map((n) => {
    const s = { from: at, to: at + n * squeeze };
    at = s.to;
    return s;
  });
  const i = spans.findIndex((s) => f >= s.from && f < s.to);
  // After the line ends, the last sentence stays up a moment, then clears.
  const line = i >= 0 ? lines[i] : f >= at && f < Math.min(hold ?? Infinity, at + 30) ? lines[lines.length - 1] : "";
  if (!line) return null;
  return (
    <div
      style={{
        marginTop: center ? 0 : 54,
        alignSelf: center ? "center" : "flex-start",
        textAlign: center ? "center" : "left",
        maxWidth: TEXT_W,
        padding: "14px 20px",
        borderRadius: 14,
        background: "rgba(30,18,8,.62)",
        color: "#fff",
        fontSize: 28,
        lineHeight: 1.4,
        fontWeight: 500,
      }}
    >
      {line}
    </div>
  );
};

/** The title card, styled like the end card; it cuts straight into the opening. */
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const n = INTRO_FRAMES;
  const rise = (delay: number) => ({
    opacity: interpolate(f, [delay, delay + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(f, [delay, delay + 18], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })}px)`,
  });
  const cardIn = interpolate(f, [0, 22], [0, 1], { extrapolateRight: "clamp", easing: ease });
  const drift = interpolate(f, [0, n], [1, 1.04]);
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: CREAM, textAlign: "center", paddingBottom: 70, transform: `scale(${drift})` }}>
        <Img
          src={staticFile("card-front.png")}
          style={{
            width: 420,
            borderRadius: 18,
            boxShadow: "0 30px 60px rgba(40,20,5,.45)",
            opacity: cardIn,
            transform: `translateY(${(1 - cardIn) * -60}px) rotate(${-4 - (1 - cardIn) * 8}deg)`,
          }}
        />
        <div style={{ marginTop: 92, ...rise(14) }}>
          <Logo size={94} />
        </div>
        <div style={{ fontSize: 34, marginTop: 18, ...rise(48), opacity: 0.92 * rise(48).opacity }}>A gift they get to choose.</div>
      </AbsoluteFill>
      {voSeconds("INTRO") ? (
        <Sequence from={VO_START}>
          <Audio src={staticFile("vo/INTRO.mp3")} />
        </Sequence>
      ) : null}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 46 }}>
        <ClosedCaptions center text={INTRO_VO} start={VO_START} frames={voSeconds("INTRO") ? VO_START + voSeconds("INTRO") * FPS : n} hold={n} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const n = END_CARD_SECONDS * FPS;
  const fade = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: CREAM, textAlign: "center", paddingBottom: 70 }}>
        <Img src={staticFile("card-front.png")} style={{ width: 420, borderRadius: 18, boxShadow: "0 30px 60px rgba(40,20,5,.45)", transform: "rotate(-4deg)" }} />
        <div style={{ marginTop: 92 }}>
          <Logo size={94} />
        </div>
        <div style={{ fontSize: 32, marginTop: 18, opacity: 0.92 }}>A gift they choose, wrapped like a surprise.</div>
        <div
          style={{
            marginTop: 34,
            fontSize: 40,
            fontWeight: 700,
            padding: "12px 28px",
            borderRadius: 999,
            background: CREAM,
            color: INK,
          }}
        >
          tap-gift.onrender.com/c/demo
        </div>
        <div style={{ marginTop: 30, fontSize: 26, letterSpacing: 1, opacity: 0.9 }}>
          PayPal Server SDK · Claude · Channel3 · Render
        </div>
      </AbsoluteFill>
      {voSeconds("END") ? (
        <Sequence from={VO_START + 6}>
          <Audio src={staticFile("vo/END.mp3")} />
        </Sequence>
      ) : null}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 46 }}>
        <ClosedCaptions center text={END_CC} start={VO_START + 6} frames={voSeconds("END") ? VO_START + 6 + voSeconds("END") * FPS : n} hold={n} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
