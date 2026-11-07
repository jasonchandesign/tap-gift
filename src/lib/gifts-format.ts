export function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

type Group = { name: string; values: string[] };

/** A gift's photos. Gifts saved before photos were kept have only the main one. */
export function photosOf(option: { images_json?: string[]; image_url: string }) {
  return option.images_json?.length ? option.images_json : [option.image_url];
}

const AGE_RANGE = /\bages?\s*(\d{1,2})\s*(?:(\+|and up|years? and up|& up)|(?:-|–|to)\s*(\d{1,2}))/i;
const AGE_PLUS = /\b(?:kids|children|boys|girls)\s*(\d{1,2})\s*\+/i;

/** The age a listing gives, such as "Ages 7+" or "Ages 8–12", or "" if it doesn't say. */
export function ageLabel(text: string) {
  const range = text.match(AGE_RANGE);
  if (range) {
    const [, from, up, to] = range;
    if (up) return `Ages ${Number(from)}+`;
    if (to && Number(to) > Number(from)) return `Ages ${Number(from)}–${Number(to)}`;
  }
  const plus = text.match(AGE_PLUS);
  return plus ? `Ages ${Number(plus[1])}+` : "";
}

/** Sizes belong to the adult. Every other choice, like color or version, is the kid's. */
export function isSizeGroup(group: Group) {
  return /size/i.test(group.name);
}

const SIZE_WORDS: Record<string, string> = {
  "extra small": "xs",
  "x-small": "xs",
  small: "s",
  medium: "m",
  large: "l",
  "extra large": "xl",
  "x-large": "xl",
};

function normalizeSize(size: string) {
  const lower = size.trim().toLowerCase();
  return SIZE_WORDS[lower] ?? lower;
}

/** Finds a wanted size among a product's labels, such as "M" in "M (8-10)" or "Medium". */
export function matchSize(values: string[], wanted: string) {
  const target = normalizeSize(wanted);
  return values.find(
    (value) =>
      normalizeSize(value) === target ||
      value.toLowerCase().split(/[^a-z0-9.]+/).map(normalizeSize).includes(target),
  );
}

/** Describes the kid's choices without making them, such as "3 colors". */
export function variantSummary(groups: Group[]) {
  return groups
    .filter((group) => !isSizeGroup(group))
    .map(({ name, values }) => `${values.length} ${name.toLowerCase().replace(/s?$/, "s")}`)
    .join(", ");
}
