export function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

type Group = { name: string; values: string[] };

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
