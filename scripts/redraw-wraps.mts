// Draws new wrapping paper for the gifts kept in a gift, replacing what they have. Use it after
// changing how paper is drawn.
//
// Local:  npx tsx --env-file=.env scripts/redraw-wraps.mts <gift link or token>
// Render: npx tsx --env-file=.env --env-file=.env.render scripts/redraw-wraps.mts <gift link or token>
import { db } from "../src/lib/db";
import { drawWraps } from "../src/lib/wraps";

const token = process.argv[2]?.match(/[a-f0-9]{32}/)?.[0];
if (!token) {
  console.error("Give the gift's link or token, such as https://tap-gift.onrender.com/g/<token>");
  process.exit(1);
}

const { query } = await db();
const [gift] = (await query<{ id: string }>("SELECT id FROM gifts WHERE token = $1", [token])).rows;
if (!gift) throw new Error("No gift with that token in this database.");

await query("UPDATE options SET wrap_json = NULL WHERE gift_id = $1 AND selected", [gift.id]);
await drawWraps(gift.id);

const { rows } = await query<{ title: string; wrap_json: unknown[] | string | null }>(
  "SELECT title, wrap_json FROM options WHERE gift_id = $1 AND selected",
  [gift.id],
);
for (const { title, wrap_json } of rows) {
  // The column is jsonb, which comes back already parsed.
  const shapes = typeof wrap_json === "string" ? JSON.parse(wrap_json) : wrap_json;
  const count = shapes?.length ?? 0;
  console.log(`${count ? `${count} shapes` : "ready-made (drawing failed)"}  ${title}`);
}
process.exit(0);
