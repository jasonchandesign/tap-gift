import type { CSSProperties } from "react";

/** The look of a kid's gift. Adding a skin here adds it everywhere, including the gifter's picker. */
export type Skin = {
  label: string;
  wrap: string;
  wrapDark: string;
  wrapPattern: string;
  wrapPatternSize: string;
  /** The color of the shapes drawn on each gift's paper. */
  wrapMotif: string;
  ribbon: string;
  knot: string;
  page: string;
  paper: string;
  ink: string;
  soft: string;
  line: string;
  action: string;
  actionDark: string;
  accent: string;
};

export const SKIN_IDS = ["ribbon", "sky", "kraft"] as const;

export type SkinId = (typeof SKIN_IDS)[number];

export const DEFAULT_SKIN: SkinId = "kraft";

export const SKINS: Record<SkinId, Skin> = {
  ribbon: {
    label: "Pine and pink",
    wrap: "#17453b",
    wrapDark: "#0f332b",
    wrapPattern: "radial-gradient(rgb(244 182 194 / 0.2) 2px, transparent 2.5px)",
    wrapPatternSize: "28px 28px",
    wrapMotif: "#2f7362",
    ribbon: "#f4b6c2",
    knot: "#e496a7",
    page: "#fbe6e2",
    paper: "#fffbf5",
    ink: "#17453b",
    soft: "#4c5f59",
    line: "#f0cdcb",
    action: "#17453b",
    actionDark: "#0f332b",
    accent: "#a92b52",
  },
  sky: {
    label: "Night sky",
    wrap: "#1b2f5e",
    wrapDark: "#12224a",
    wrapPattern:
      "radial-gradient(rgb(255 251 245 / 0.75) 1.5px, transparent 2px), radial-gradient(rgb(244 162 89 / 0.6) 2.5px, transparent 3px), radial-gradient(rgb(255 251 245 / 0.35) 1px, transparent 1.5px)",
    wrapPatternSize: "70px 70px, 110px 110px, 40px 40px",
    wrapMotif: "#3f5ea8",
    ribbon: "#f4a259",
    knot: "#d9833a",
    page: "#eaf0fa",
    paper: "#fffbf5",
    ink: "#1b2f5e",
    soft: "#46557a",
    line: "#cfdbee",
    action: "#1b2f5e",
    actionDark: "#12224a",
    accent: "#a84b14",
  },
  kraft: {
    label: "Brown paper",
    wrap: "#b8875a",
    wrapDark: "#9c7046",
    wrapPattern: "repeating-linear-gradient(90deg, rgb(90 55 25 / 0.1) 0 2px, transparent 2px 14px)",
    wrapPatternSize: "auto",
    wrapMotif: "#d6ad80",
    ribbon: "#fff3df",
    knot: "#e6d3b4",
    page: "#f4eadb",
    paper: "#fffbf5",
    ink: "#3d2a1a",
    soft: "#66503c",
    line: "#e2d2bc",
    action: "#3d2a1a",
    actionDark: "#2b1c10",
    accent: "#1f5f50",
  },
};

/**
 * Who the gift is for suggests a skin and sets the chat's wording. The gifter can pick another
 * skin, and the AI isn't told, so a girl who loves dinosaurs still gets dinosaurs.
 */
export const AUDIENCES = [
  {
    id: "girl",
    label: "Girl",
    skin: "ribbon",
    phrase: "a girl",
    likes: "she likes",
  },
  {
    id: "boy",
    label: "Boy",
    skin: "sky",
    phrase: "a boy",
    likes: "he likes",
  },
  {
    id: "any",
    label: "Rather not say",
    skin: "kraft",
    phrase: "anyone",
    likes: "they like",
  },
] as const satisfies {
  id: string;
  label: string;
  skin: SkinId;
  phrase: string;
  likes: string;
}[];

export type Audience = (typeof AUDIENCES)[number];

export type AudienceId = Audience["id"];

export const AUDIENCE_IDS = ["girl", "boy", "any"] as const satisfies AudienceId[];

export function audienceFor(id: string): Audience {
  return AUDIENCES.find((audience) => audience.id === id) ?? AUDIENCES[2];
}

export function skinFor(id: string | undefined): Skin {
  return SKINS[id as SkinId] ?? SKINS[DEFAULT_SKIN];
}

/** Sets a skin's colors on an element, and everything inside it picks them up. */
export function skinStyle(id: string | undefined) {
  const skin = skinFor(id);
  return {
    "--wrap": skin.wrap,
    "--wrap-dark": skin.wrapDark,
    "--wrap-pattern": skin.wrapPattern,
    "--wrap-pattern-size": skin.wrapPatternSize,
    "--ribbon": skin.ribbon,
    "--knot": skin.knot,
    "--page": skin.page,
    "--paper": skin.paper,
    "--ink": skin.ink,
    "--soft": skin.soft,
    "--line": skin.line,
    "--action": skin.action,
    "--action-dark": skin.actionDark,
    "--accent": skin.accent,
  } as CSSProperties;
}
