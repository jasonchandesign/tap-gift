/**
 * The tappable ideas in the gifter's chat. They're canned rather than written by the AI, so
 * every one suits the recipient's age and steers toward gifts the rules allow.
 */

// No pronouns, so one idea works whoever the gift is for. Shared ideas suit anyone of that age.
const POOLS = {
  kid: {
    shared: [
      "Loves the outdoors",
      "Into art and crafts",
      "Loves animals",
      "Likes to build things",
      "Into science",
      "Loves reading",
      "Into music",
    ],
    girl: ["Loves unicorns", "Into horses", "Loves to dance", "Into making jewelry"],
    boy: ["Into dinosaurs", "Loves soccer", "Likes cars and trucks", "Into space"],
  },
  teen: {
    shared: [
      "Into music",
      "Loves the outdoors",
      "Into gaming",
      "Loves to read",
      "Into photography",
      "Likes to cook",
      "Into drawing",
    ],
    girl: ["Into makeup", "Loves skincare", "Into fashion", "Plays volleyball"],
    boy: ["Plays basketball", "Into sneakers", "Skateboards", "Plays guitar"],
  },
  adult: {
    shared: [
      "Loves to cook",
      "Into coffee",
      "Loves hiking",
      "Into gardening",
      "Loves to read",
      "Into board games",
      "Loves to travel",
    ],
    girl: ["Into yoga", "Loves skincare", "Loves baking", "Into jewelry"],
    boy: ["Into grilling", "Plays golf", "Loves fishing", "Into woodworking"],
  },
};

const SHOWN = 3;

type Recipient = { id: string; recipient_age: number; audience: string };

function stage(age: number) {
  return age < 13 ? "kid" : age < 18 ? "teen" : "adult";
}

function shuffle(ideas: string[], seed: number) {
  const list = [...ideas];
  for (let index = list.length - 1; index > 0; index -= 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const other = seed % (index + 1);
    [list[index], list[other]] = [list[other], list[index]];
  }
  return list;
}

/**
 * The same gift always gets the same order, so the ideas don't change on reload. For a girl or
 * boy, the order alternates their own ideas with shared ones.
 */
function ordered(gift: Recipient) {
  const pools = POOLS[stage(gift.recipient_age)];
  const seed = [...gift.id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
  const shared = shuffle(pools.shared, seed);
  if (gift.audience !== "girl" && gift.audience !== "boy") return shared;
  const own = shuffle(pools[gift.audience], seed + 1);
  return Array.from({ length: Math.max(own.length, shared.length) }, (_, index) => [
    own[index],
    shared[index],
  ])
    .flat()
    .filter((idea): idea is string => !!idea);
}

/** Ideas to start the chat. */
export function starterIdeas(gift: Recipient) {
  return ordered(gift).slice(0, SHOWN);
}

/** A round limit below some of the gifts on screen, or null if it wouldn't change anything. */
function lowerPrice(priceCents: number[]) {
  if (priceCents.length < 2) return null;
  const sorted = [...priceCents].sort((a, b) => a - b);
  const middle = sorted[Math.floor(sorted.length / 2)] / 100;
  const limit = Math.ceil(middle / 5) * 5;
  return limit >= 10 && limit * 100 < sorted[sorted.length - 1] ? `Under $${limit}` : null;
}

function unused(ideas: string[], said: string[]) {
  const used = new Set(said.map((text) => text.trim().toLowerCase()));
  return ideas.filter((idea) => !used.has(idea.toLowerCase()));
}

/** Canned ideas the gifter hasn't sent yet, the ones they haven't seen first. */
export function cannedLeft(gift: Recipient, said: string[]) {
  const all = ordered(gift);
  return unused([...all.slice(SHOWN), ...all.slice(0, SHOWN)], said);
}

/**
 * Ideas after a reply: more of the same, another interest the gifter hasn't tried, and a lower
 * price when some gifts cost more than it. Once the canned ideas run out, the AI's own ideas
 * (already checked by the caller) take their place.
 */
export function followUpIdeas(
  gift: Recipient,
  priceCents: number[],
  said: string[],
  aiIdeas: string[] = [],
) {
  const canned = cannedLeft(gift, said);
  // Each turn moves the canned ideas along by one.
  const shift = canned.length ? Math.max(said.length - 1, 0) % canned.length : 0;
  const next = canned.length
    ? [...canned.slice(shift), ...canned.slice(0, shift)]
    : unused(aiIdeas, said);
  const ideas = priceCents.length
    ? ["More like these", next[0], lowerPrice(priceCents)]
    : next.slice(0, 2);
  return ideas.filter((idea): idea is string => !!idea).slice(0, SHOWN);
}
