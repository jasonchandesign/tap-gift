// Prints links to write onto blank NFC cards, one per card. Each card is written once, ever.
// A card joins the database the first time a gift is paid for from it.
import { randomBytes } from "node:crypto";

const count = Number(process.argv[2] ?? 10);
const base = (process.env.APP_URL ?? "https://tap-gift.onrender.com").replace(/\/$/, "");

for (let index = 0; index < count; index++) {
  console.log(`${base}/c/${randomBytes(12).toString("base64url")}`);
}
