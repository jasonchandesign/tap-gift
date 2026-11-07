import type { Offer, Product } from "./channel3";
import { ageLabel, isSizeGroup, matchSize } from "./gifts-format";

/** Hard limits live here, in code, so the model can't talk its way past them. */

/** Blocked for everyone, unless allowedFrom sets the age it opens up at. */
const BLOCKED: { name: string; pattern: RegExp; allowedFrom?: number }[] = [
  { name: "gift cards", pattern: /\b(gift ?cards?|e-?gift|gift certificates?|prepaid cards?)\b/i },
  {
    name: "weapons",
    pattern:
      /\b(guns?|shotguns?|rifles?|pistols?|airsoft|bb gun|pellet|ammo|ammunition|knife|knives|daggers?|swords?|machetes?|crossbows?|tasers?|stun gun|pepper spray|brass knuckles?|firearms?)\b/i,
  },
  {
    name: "mature content",
    pattern:
      /\b(adults? only|erotic|lingerie|sex|sexy|vibrators?|tobacco|cigars?|cigarettes?|vapes?|vaping|cbd|thc|cannabis|alcohol|whiskey|vodka|wine|beer|gambling|casino)\b/i,
  },
  {
    name: "supplements",
    pattern:
      /\b(supplements?|vitamins?|protein powder|melatonin|probiotics?|multivitamins?|weight loss|creatine)\b/i,
  },
  {
    name: "makeup and skincare",
    pattern:
      /\b(cosmetics?|makeup|make-up|lipsticks?|lip gloss|mascara|eyeliner|eyeshadow|foundation|nail polish|skin ?care)\b/i,
    allowedFrom: 13,
  },
  {
    name: "fragrance",
    pattern:
      /\b(perfumes?|parfums?|eau de|edt|edp|colognes?|fragrances?|body sprays?|body mists?|bath (?:and|&) body works)\b/i,
    allowedFrom: 18,
  },
  { name: "anti-aging", pattern: /\banti-?aging\b/i, allowedFrom: 18 },
];

function blockedAt(age: number) {
  return BLOCKED.filter(({ allowedFrom }) => allowedFrom === undefined || age < allowedFrom);
}

/** What code removes from every search at this age, so the AI can say so when asked. */
export function offLimits(age: number) {
  return blockedAt(age).map(({ name }) => name);
}

/** Whether text names something off-limits at this age. */
export function isOffLimits(text: string, age: number) {
  return blockedAt(age).some(({ pattern }) => pattern.test(text));
}

const MAX_PHOTOS = 6;

const US_DOMAIN = /\.(com|us|net|org)$/i;

export type RuleCheck = {
  price_cents: number;
  budget_cents: number;
  under_budget: boolean;
  in_stock: boolean;
  us_merchant: boolean;
  blocked_category: string | null;
  avoid_match: string | null;
};

export type VariantGroup = {
  name: string;
  values: string[];
  /** A photo for each value that has one, such as each color. */
  images?: Record<string, string>;
};

export type CheckedProduct = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  merchant: string;
  merchantUrl: string;
  imageUrl: string;
  /** Every photo, main one first. */
  images: string[];
  /** Such as "Ages 7+", when the listing says. */
  ageLabel: string;
  age: string | null;
  category: string;
  variants: VariantGroup[];
  check: RuleCheck;
};

function toCents(offer: Offer) {
  return Math.round((offer.price?.price ?? 0) * 100);
}

function isBuyable(offer: Offer) {
  return (
    offer.availability === "InStock" &&
    offer.price?.currency === "USD" &&
    toCents(offer) > 0 &&
    (offer.condition ?? "new") === "new" &&
    US_DOMAIN.test(offer.domain ?? "") &&
    (offer.url ?? "").startsWith("https://")
  );
}

function categoryText(product: Product) {
  const { slug, title, path } = product.category ?? {};
  return [slug?.replaceAll("-", " "), title, [path].flat().join(" ")].filter(Boolean).join(" ");
}

/** The choices a gifter must make, such as color or size. A single value isn't a choice. */
function variantGroups(product: Product): VariantGroup[] {
  return (product.variants?.options ?? []).flatMap((option) => {
    const kept = (option.values ?? [])
      .filter((value) => value.exists !== false && value.available !== "OutOfStock")
      .map((value) => ({ label: value.label?.trim() ?? "", image: value.thumbnail_url ?? "" }))
      .filter(({ label }) => label && !/\bnull\b/i.test(label));
    const unique = [...new Set(kept.map(({ label }) => label))].slice(0, 30);
    if (!option.name || unique.length < 2) return [];

    const images: Record<string, string> = {};
    for (const { label, image } of kept) {
      if (unique.includes(label) && image.startsWith("https://") && !images[label]) images[label] = image;
    }
    return [{ name: option.name, values: unique, ...(Object.keys(images).length ? { images } : {}) }];
  });
}

function matchesTerm(text: string, term: string) {
  const words = term.trim().toLowerCase().replace(/s$/, "");
  if (!words) return false;
  const escaped = words.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}`, "i").test(text);
}

/** Returns the product with its cheapest valid offer, or null if any rule fails. */
export function checkProduct(
  product: Product,
  budgetCents: number,
  avoid: string[],
  age: number,
  size?: string,
): CheckedProduct | null {
  const offer = (product.offers ?? [])
    .filter(isBuyable)
    .sort((a, b) => toCents(a) - toCents(b))[0];
  if (!offer) return null;

  const category = categoryText(product);
  const text = `${product.title} ${category}`;
  const blocked = blockedAt(age).find(({ pattern }) => pattern.test(text));
  const avoidMatch = avoid.find((term) => matchesTerm(text, term)) ?? null;
  const priceCents = toCents(offer);
  const images = product.images ?? [];
  const imageUrl = (images.find((image) => image.is_main_image) ?? images[0])?.url ?? "";
  const photos = [
    ...new Set([imageUrl, ...images.map((image) => image.url ?? "")].filter((url) => url.startsWith("https://"))),
  ].slice(0, MAX_PHOTOS);

  if (priceCents > budgetCents || blocked || avoidMatch || !imageUrl.startsWith("https://")) {
    return null;
  }

  // A product with sizes must have this one in stock. Toys and other unsized items still pass.
  const variants = variantGroups(product);
  const hasSize = variants.filter(isSizeGroup).every((group) => matchSize(group.values, size ?? ""));
  if (size && !hasSize) return null;

  return {
    id: product.id,
    title: product.title,
    description: product.description?.trim().slice(0, 600) ?? "",
    priceCents,
    merchant: offer.domain ?? "",
    merchantUrl: offer.url ?? "",
    imageUrl,
    images: photos,
    ageLabel: ageLabel(`${product.title} ${product.description ?? ""}`),
    age: product.age ?? null,
    category,
    variants,
    check: {
      price_cents: priceCents,
      budget_cents: budgetCents,
      under_budget: true,
      in_stock: true,
      us_merchant: true,
      blocked_category: null,
      avoid_match: null,
    },
  };
}
