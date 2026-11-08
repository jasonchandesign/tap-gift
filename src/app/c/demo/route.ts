import { randomBytes } from "node:crypto";
import { connection } from "next/server";
import { appUrl, DEMO_CARD_PREFIX } from "@/lib/gifts";

/**
 * A pretend blank card for anyone without a real one. Each visit gets its own, so judges sharing
 * this link never land on each other's gifts. It then opens like a tap on a real card.
 */
export async function GET() {
  await connection();
  const cardId = `${DEMO_CARD_PREFIX}${randomBytes(9).toString("base64url")}`;
  return Response.redirect(`${appUrl()}/c/${cardId}`, 307);
}
