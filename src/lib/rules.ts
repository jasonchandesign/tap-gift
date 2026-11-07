import type { Offer, Product } from "./channel3";
import { isSizeGroup, matchSize } from "./gifts-format";

/** Hard limits live here, in code, so the model can't talk its way past them. */

const BLOCKED: Record<string, RegExp> = {
  "gift cards": /\b(gift ?cards?|e-?gift|gift certificates?|prepaid cards?)\b/i,
  weapons:
    /\b(guns?|rifles?|pistols?|airsoft|bb gun|pellet|ammo|ammunition|knife|knives|daggers?|swords?|machetes?|crossbows?|tasers?|stun gun|pepper spray|brass knuckles?|firearms?)\b/i,
  "mature content":
    /\b(adults? only|erotic|lingerie|sex|sexy|vibrators?|tobacco|cigars?|cigarettes?|vapes?|vaping|cbd|thc|cannabis|alcohol|whiskey|vodka|wine|beer|gambling|casino)\b/i,
  supplements:
    /\b(supplements?|vitamins?|protein powder|melatonin|probiotics?|multivitamins?|weight loss|creatine)\b/i,
  cosmetics:
    /\b(cosmetics?|makeup|make-up|lipsticks?|lip gloss|mascara|eyeliner|eyeshadow|foundation|perfumes?|colognes?|fragrances?|nail polish|skin ?care|anti-?aging)\b/i,
};

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

export type VariantGroup = { name: string; values: string[] };

export type CheckedProduct = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  merchant: string;
  merchantUrl: string;
  imageUrl: string;
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
    const values = (option.values ?? [])
      .filter((value) => value.exists !== false && value.available !== "OutOfStock")
      .map((value) => value.label?.trim() ?? "")
      .filter((label) => label && !/\bnull\b/i.test(label));
    const unique = [...new Set(values)].slice(0, 30);
    return option.name && unique.length > 1 ? [{ name: option.name, values: unique }] : [];
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
  size?: string,
): CheckedProduct | null {
  const offer = (product.offers ?? [])
    .filter(isBuyable)
    .sort((a, b) => toCents(a) - toCents(b))[0];
  if (!offer) return null;

  const category = categoryText(product);
  const text = `${product.title} ${category}`;
  const blocked = Object.keys(BLOCKED).find((name) => BLOCKED[name].test(text)) ?? null;
  const avoidMatch = avoid.find((term) => matchesTerm(text, term)) ?? null;
  const priceCents = toCents(offer);
  const images = product.images ?? [];
  const imageUrl = (images.find((image) => image.is_main_image) ?? images[0])?.url ?? "";

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
