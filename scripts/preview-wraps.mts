// Writes an HTML page showing the wrapping paper of each gift kept in a gift, to check how it looks.
//
// npx tsx --env-file=.env scripts/preview-wraps.mts <gift link or token> <output.html>
import { writeFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { wrapPattern, type Motif } from "../src/lib/wraps";

const token = process.argv[2]?.match(/[a-f0-9]{32}/)?.[0];
const out = process.argv[3];
if (!token || !out) {
  console.error("Give the gift's link or token, then the HTML file to write.");
  process.exit(1);
}

const { query } = await db();
const { rows } = await query<{ title: string; wrap_json: Motif[] | null }>(
  `SELECT o.title, o.wrap_json FROM options o JOIN gifts g ON g.id = o.gift_id
   WHERE g.token = $1 AND o.selected ORDER BY o.id`,
  [token],
);

const papers = rows
  .map(({ title, wrap_json }, index) => {
    const { image, size } = wrapPattern(wrap_json, index, "#e8c79a");
    return `<figure><div style="background:#b5835a ${image.replace(/"/g, "'")};background-size:${size}"></div><figcaption>${title}</figcaption></figure>`;
  })
  .join("");
writeFileSync(
  out,
  `<!doctype html><style>body{display:flex;gap:16px;margin:16px;font-family:sans-serif}figure{flex:1;margin:0}figure div{height:600px;border-radius:12px}</style>${papers}`,
);
console.log(`Wrote ${rows.length} papers to ${out}`);
process.exit(0);
