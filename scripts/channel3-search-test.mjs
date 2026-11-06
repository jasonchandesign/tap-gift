// Runs one Channel3 product search to confirm the key works and to show what comes back.
// Run with: npm run channel3:test
const { CHANNEL3_API_KEY, QUERY = "horse art kit for kids", MAX_PRICE = "50" } = process.env;

if (!CHANNEL3_API_KEY) {
  console.error("Set CHANNEL3_API_KEY in .env first.");
  process.exit(1);
}

const res = await fetch("https://api.trychannel3.com/v1/search", {
  method: "POST",
  headers: { "x-api-key": CHANNEL3_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: QUERY,
    filters: { price: { max_price: Number(MAX_PRICE) }, availability: ["InStock"] },
    limit: 6,
  }),
});
const data = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`Search failed with ${res.status}`);
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

const products = data.products ?? [];
console.log(`${products.length} results for "${QUERY}" under $${MAX_PRICE}:\n`);
for (const product of products) {
  console.log(`- ${product.title}: ${JSON.stringify(product.offers?.[0]?.price)}`);
}
if (products[0]) {
  console.log("\nFirst product in full, to confirm the response fields:");
  console.log(JSON.stringify(products[0], null, 2));
}
