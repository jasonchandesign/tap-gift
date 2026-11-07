// Swaps the gifts inside a paid test gift for real products that show off the recipient's page:
// several photos, a color to pick, and an age tag. For demos and testing only.
//
// Local:  npx tsx --env-file=.env scripts/demo-picks.mts <gift link or token> [--dry]
// Render: put DATABASE_URL=<Render's external URL> in .env.render, then
//         npx tsx --env-file=.env --env-file=.env.render scripts/demo-picks.mts <gift link> [--dry]
//
// The old picks stay in the database, just no longer kept. The amount paid doesn't change, so
// every new pick costs no more than it.
import { searchProducts } from "../src/lib/channel3";
import { db } from "../src/lib/db";
import { isSizeGroup } from "../src/lib/gifts-format";
import { checkProduct, type CheckedProduct } from "../src/lib/rules";
import { drawWraps } from "../src/lib/wraps";

const SEARCHES = {
  kid: ["kids rain jacket", "kids hoodie", "lego set for kids", "science kit for kids", "kids water bottle"],
  teen: ["hoodie for teens", "teen backpack", "lego set for teens", "headphones for teens"],
  adult: ["men's rain jacket", "women's hoodie", "lego set for adults", "insulated water bottle"],
};
const PICKS = 3;

const [link, flag] = process.argv.slice(2);
const token = link?.match(/[a-f0-9]{32}/)?.[0];
if (!token) {
  console.error("Give the gift's link or token, such as https://tap-gift.onrender.com/g/<token>");
  process.exit(1);
}
if (!process.env.CHANNEL3_API_KEY) {
  console.error("CHANNEL3_API_KEY is missing. Pass --env-file=.env first.");
  process.exit(1);
}

const { query } = await db();
const [gift] = (
  await query<{ id: string; recipient_name: string; recipient_age: number; status: string; paid_cents: number }>(
    "SELECT id, recipient_name, recipient_age, status, paid_cents FROM gifts WHERE token = $1",
    [token],
  )
).rows;
if (!gift) throw new Error("No gift with that token in this database.");
if (gift.status !== "paid") {
  throw new Error(`This gift is ${gift.status}. Use one that's paid but not opened yet.`);
}

const stage = gift.recipient_age < 13 ? "kid" : gift.recipient_age < 18 ? "teen" : "adult";
const found = new Map<string, CheckedProduct>();
for (const search of SEARCHES[stage]) {
  for (const product of await searchProducts(search, gift.paid_cents / 100)) {
    const checked = checkProduct(product, gift.paid_cents, [], gift.recipient_age);
    if (checked && checked.images.length > 1) found.set(checked.id, checked);
  }
}

const colors = (product: CheckedProduct) => product.variants.some((group) => !isSizeGroup(group));
const score = (product: CheckedProduct) =>
  Math.min(product.images.length, 6) + (colors(product) ? 6 : 0) + (product.ageLabel ? 6 : 0);
const pool = [...found.values()].sort((a, b) => score(b) - score(a));

// One with colors, one with an age tag, then the best of the rest.
const picks: CheckedProduct[] = [];
for (const wanted of [colors, (product: CheckedProduct) => !!product.ageLabel, () => true]) {
  const next = pool.find((product) => wanted(product) && !picks.includes(product));
  if (next) picks.push(next);
}
while (picks.length < PICKS && pool.length > picks.length) {
  picks.push(pool.find((product) => !picks.includes(product))!);
}
if (picks.length < 2) throw new Error("Not enough products found. Try again in a moment.");

for (const product of picks) {
  const sizes = product.variants.filter(isSizeGroup);
  console.log(
    `- ${product.title} ($${(product.priceCents / 100).toFixed(2)}): ${product.images.length} photos,` +
      ` ${product.variants.map(({ name, values }) => `${values.length} ${name}`).join(", ") || "no choices"},` +
      ` ${product.ageLabel || "no age tag"}${sizes.length ? `, size set to ${middle(sizes[0].values)}` : ""}`,
  );
}

function middle(values: string[]) {
  return values[Math.floor(values.length / 2)];
}

if (flag === "--dry") {
  console.log("Dry run, nothing saved.");
  process.exit(0);
}

await query("UPDATE options SET selected = false WHERE gift_id = $1 AND selected", [gift.id]);
for (const product of picks) {
  // The gifter picks sizes, so choose one here. Colors are left for the recipient.
  const sizeChoice = Object.fromEntries(
    product.variants.filter(isSizeGroup).map(({ name, values }) => [name, middle(values)]),
  );
  await query(
    `INSERT INTO options (gift_id, turn, channel3_id, title, description, price_cents, image_url,
       merchant, merchant_url, reason, rule_check_json, variants_json, images_json, age_label,
       selected, variant_choice_json)
     VALUES ($1, 0, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14)`,
    [
      gift.id,
      product.id,
      product.title,
      product.description,
      product.priceCents,
      product.imageUrl,
      product.merchant,
      product.merchantUrl,
      `Picked for ${gift.recipient_name} to try out.`,
      JSON.stringify(product.check),
      JSON.stringify(product.variants),
      JSON.stringify(product.images),
      product.ageLabel,
      JSON.stringify(sizeChoice),
    ],
  );
}
await drawWraps(gift.id);
console.log(`Saved ${picks.length} gifts. Reload the gift link to unwrap them.`);
process.exit(0);
