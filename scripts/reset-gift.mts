// Undoes a recipient's pick, so a paid test gift can be opened and unwrapped again. For demos and
// testing only: the order and thank-you note are deleted, and the gift goes back to paid.
//
// Local:  npx tsx --env-file=.env scripts/reset-gift.mts <gift link or token>
// Render: npx tsx --env-file=.env --env-file=.env.render scripts/reset-gift.mts <gift link or token>
//
// A refund already sent for the gift stays recorded, so picking again won't refund twice.
import { db } from "../src/lib/db";

const token = process.argv[2]?.match(/[a-f0-9]{32}/)?.[0];
if (!token) {
  console.error("Give the gift's link or token, such as https://tap-gift.onrender.com/g/<token>");
  process.exit(1);
}

const { query } = await db();
const [gift] = (
  await query<{ id: string; recipient_name: string; status: string }>(
    "SELECT id, recipient_name, status FROM gifts WHERE token = $1",
    [token],
  )
).rows;
if (!gift) throw new Error("No gift with that token in this database.");
if (gift.status !== "chosen") {
  console.log(`${gift.recipient_name}'s gift is ${gift.status}, not chosen, so there's nothing to undo.`);
  process.exit(0);
}

// The pick saved the recipient's color into the option and showed that color's photo. Keep only
// the gifter's size, and go back to the main photo.
const { rows: picked } = await query<{ option_id: string }>("SELECT option_id FROM orders WHERE gift_id = $1", [gift.id]);
for (const { option_id } of picked) {
  await query(
    `UPDATE options SET
       variant_choice_json = (
         SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
         FROM jsonb_each(COALESCE(variant_choice_json, '{}'::jsonb)) WHERE key ~* 'size'
       ),
       image_url = COALESCE(images_json->>0, image_url)
     WHERE id = $1`,
    [option_id],
  );
}
await query("DELETE FROM orders WHERE gift_id = $1", [gift.id]);
await query("UPDATE gifts SET status = 'paid', refund_cents = 0 WHERE id = $1", [gift.id]);
console.log(`${gift.recipient_name}'s gift is ready to unwrap again.`);
process.exit(0);
