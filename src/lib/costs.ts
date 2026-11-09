// What one gift would really cost to send: its price, the store's shipping and sales tax.
// Channel3 gives prices but not shipping or tax, so both are estimates. No server-only code here,
// so the confirm page and the pay route work out the same numbers.

/** Statewide base sales tax rates, in percent. Local taxes and clothing exemptions are left out. */
const STATE_TAX: Record<string, number> = {
  AL: 4, AK: 0, AZ: 5.6, AR: 6.5, CA: 7.25, CO: 2.9, CT: 6.35, DE: 0, DC: 6, FL: 6,
  GA: 4, HI: 4, ID: 6, IL: 6.25, IN: 7, IA: 6, KS: 6.5, KY: 6, LA: 5, ME: 5.5,
  MD: 6, MA: 6.25, MI: 6, MN: 6.875, MS: 7, MO: 4.225, MT: 0, NE: 5.5, NV: 6.85, NH: 0,
  NJ: 6.625, NM: 4.875, NY: 4, NC: 4.75, ND: 5, OH: 5.75, OK: 4.5, OR: 0, PA: 6, RI: 7,
  SC: 6, SD: 4.2, TN: 7, TX: 6.25, UT: 6.1, VT: 6, VA: 5.3, WA: 6.5, WV: 6, WI: 5, WY: 4,
};

/** Most stores ship free over about $50. Below that, a typical flat rate. */
export const FREE_SHIPPING_FROM_CENTS = 5_000;
export const SHIPPING_CENTS = 599;

export type Cost = {
  item_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  /** The state the tax was worked out for, and its rate in percent. */
  state: string;
  tax_rate: number;
};

export function taxRate(state: string) {
  return STATE_TAX[state.trim().toUpperCase()] ?? 0;
}

/** One gift's estimated cost, shipped to the given state. Tax is on the item, not the shipping. */
export function estimateCost(priceCents: number, state: string): Cost {
  const rate = taxRate(state);
  const shipping = priceCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
  const tax = Math.round((priceCents * rate) / 100);
  return {
    item_cents: priceCents,
    shipping_cents: shipping,
    tax_cents: tax,
    total_cents: priceCents + shipping + tax,
    state: state.trim().toUpperCase(),
    tax_rate: rate,
  };
}

/** Gifts paid for before costs were kept were charged the price alone. */
export function priceOnly(priceCents: number, state = ""): Cost {
  return { item_cents: priceCents, shipping_cents: 0, tax_cents: 0, total_cents: priceCents, state, tax_rate: 0 };
}

/** The pick that costs the most to send. Charging for it covers whichever one the kid keeps. */
export function costliest<T extends { cost: Cost }>(picks: T[]) {
  return picks.reduce((most, pick) => (pick.cost.total_cents > most.cost.total_cents ? pick : most));
}
