# Tap Gift

Tap Gift turns an NFC card or a shared link into a gift worth unwrapping. A gifter chats with an AI about what the kid loves and adds a few of its ideas to a cart. The gifter pays up front with PayPal for the priciest gift in the cart. The kid taps the card and tears open each gift, wrapped in paper the AI drew as a clue to what's inside, then chooses one. A cheaper choice refunds the difference. Fulfillment is simulated: this runs in the PayPal sandbox and nothing is bought from the store.

Built for the PayPal AI Hackathon. Sandbox only.

## Try it

Open https://tap-gift.onrender.com on your phone. A computer works too. No card is needed, and each person creates their own gift.

1. Tap **Start a gift**, enter a kid's name and age, and pick a wrap.
2. Tell the chat what the kid loves. Try a refinement like "under $30" or "no screens".
3. Add two or three gifts at different prices to the cart, then check out.
4. Pay with a PayPal sandbox buyer login from the list below. No real money moves.
5. Open the gift link on the last page. That's what the kid sees when they tap the card.
6. Tear open each gift, review them and choose one. If it's cheaper than the priciest gift, the difference is refunded in the sandbox.

Sandbox buyer logins:

<!-- Add the tested sandbox logins here before submitting. -->

NFC cards are tested on iPhone only. Android generally opens a card's link natively, but that's untested here, so use the gift link instead.

## What the kid sees

The gift opens as a wrapped present with a tag that reads "To" and "From". The tag flips over once to explain the game: unwrap every gift, then keep one. Tapping the tag flips it again at any time. The kid tears the paper with a finger, and the rip follows the finger's path. Each gift shows its photos, its colors or versions, and its description. Once every gift is open, the kid picks one, chooses a color if there is one, and can send a thank-you note. On a computer, a QR code in the corner opens the same page on a phone.

## How the AI works

Claude does two jobs, and the kid never talks to it.

- **Shopping chat (Claude Haiku 5.5):** a tool-using agent that saves the gifter's rules, searches real products through Channel3, and proposes 3 to 5 gifts with a reason for each. See `src/lib/shopper.ts`.
- **Wrapping paper (Claude Sonnet 5.5):** after payment, it names the family of things each gift belongs to and draws four silhouettes from it, such as a t-shirt, sock, cap and trousers for clothing, or a car, dump truck, digger and cone for a toy truck. The paper hints at what's inside without showing it. See `src/lib/wraps.ts`.

The AI makes the judgment calls, and code enforces the hard limits in `src/lib/rules.ts`: price, stock, new condition, US stores, blocked categories, things to avoid and size. Some limits follow the recipient's age: makeup and skincare open up at 13, and fragrance at 18. The prompt also shops for a child, a teenager or an adult based on the age. A dollar amount in the gifter's message becomes the limit in code, even if the model misses it. The model can only propose products that came back from a search in that turn.

The tappable ideas in the chat are canned, not written by the AI. `src/lib/starters.ts` has a few per age group (kid, teen, adult) and for girl, boy or anyone. After a reply, the chat offers more like these, an idea the gifter hasn't tried and a lower price when some gifts cost more. Once the canned ideas run out, the AI suggests new interests, and code drops any that are long, mention money or name something off-limits at that age. The AI's prompt also lists what's off-limits at the recipient's age, so it can say so and suggest something close when a gifter asks. Each gift gets 20 AI turns, enough for most gifters, which caps anyone gaming it.

## Shopping eval

`npm run eval` runs 30 scripted chats against a running app: 10 gifter prompts with 3 refinements each (a price limit, something to avoid and a clothing size). Three of the prompts ask for things the rules block: a knife or BB gun, makeup and perfume, and a gift card. The script checks every option against the limits stated in the chat, not the limits the app saved.

Latest run: **0 rule violations across 250 options in 60 chat turns.** The checks cover price limits, blocked terms and avoided terms in product titles, US stores, sizes and money talk in reasons.

Earlier runs found real problems, which were fixed before this run:

- A stated dollar limit the model failed to save, which let two products over the limit through.
- Body sprays, fragrances listed as "EDT", a fragrance gift set and a toy shotgun that got past the blocked list.
- A reason that mentioned a lower cost.

A separate Claude Sonnet review also reads each option. It isn't a hard rule, and it varies from run to run. In the latest run it flagged 11 reasons (4%) for adding a detail the listing doesn't show, and 17 options (7%) as a poor age fit, usually a toy for younger kids. The blocked list matches words in titles and categories, so a product with an unusual title can still get through. The latest review flagged one like that, a pocket blade sharpener shown after a request for a knife.

## How the money moves

PayPal's Orders API charges the gifter for the priciest gift when they check out (`src/lib/paypal.ts`). When the kid chooses, the server rechecks the product, changes the gift's status in one atomic update so a double tap can't choose twice, and records the order (`src/lib/checkout.ts`). Any difference goes back through PayPal's Payments API as a refund on the original capture. The refund uses a fixed request ID per gift, so a retry can't refund twice, and a failed refund stays owed and is retried when the gifter opens their gift page. A canceled gift refunds in full.

## Kids and privacy

The kid has no account, never talks to the AI and types nothing except an optional thank-you. An adult makes every decision about what's offered and pays for it. Opening a gift link changes nothing, so link previews and email scanners can't spend a gift.

## Built with

- **Next.js 16** on **Render**, with Render Postgres. Locally, the app falls back to an embedded PGlite database in `.pglite/` when `DATABASE_URL` is blank.
- **PayPal Server SDK** for Orders and Refunds, in the sandbox.
- **Claude API** for the shopping agent and the wrapping paper.
- **Channel3** for real product search.
- **Claude Code** built the app, with the **APIMatic Context Plugin for PayPal** supplying PayPal SDK context.

## Run locally

```bash
npm install
cp .env.example .env   # then fill in the keys
npm run dev
```

| Variable | What it's for |
| --- | --- |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | A PayPal sandbox app with Accept payments turned on |
| `PAYPAL_API_BASE` | `https://api-m.sandbox.paypal.com` |
| `ANTHROPIC_API_KEY` | The Claude API |
| `CHANNEL3_API_KEY` | Channel3 product search |
| `DATABASE_URL` | Postgres. Leave it blank to use PGlite locally |
| `APP_URL` | The app's public URL, used in card and gift links |

## Deploy

`render.yaml` defines the web service and Postgres database. Create a Blueprint from this repo in Render and fill in the prompted keys.

## Scripts

Run these from the repo root. Local scripts use PGlite, which only one process can open, so stop `npm run dev` first. To run one against Render, put Render's external `DATABASE_URL` in `.env.render` and add `--env-file=.env.render` after `--env-file=.env`.

| Command | What it does |
| --- | --- |
| `npm run channel3:test` | Runs one Channel3 search. Set `QUERY` and `MAX_PRICE` to try others |
| `npm run eval` | The shopping eval above, against a running app |
| `npm run cards -- 10` | Prints 10 NFC card links |
| `npx tsx --env-file=.env scripts/demo-picks.mts <gift link> --dry` | Swaps a paid, unopened gift's picks for products with several photos, colors and an age tag. Drop `--dry` to save |
| `npx tsx --env-file=.env scripts/reset-gift.mts <gift link>` | Undoes a kid's choice so a test gift can be opened again. A refund already sent stays recorded, so choosing again won't refund twice |
| `npx tsx --env-file=.env scripts/redraw-wraps.mts <gift link>` | Draws a gift's wrapping paper again |
| `npx tsx --env-file=.env scripts/preview-wraps.mts <gift link> <out.html>` | Writes an HTML page showing a gift's papers |

## Make NFC cards

Each card is written once, ever. Its link stays the same, and the gift it opens changes.

```bash
npm run cards -- 10
```

This prints 10 links. Write one onto each blank card with the free NFC Tools app: Write, Add a record, URL/URI, paste the link, OK, then Write and hold the card to the phone. Don't use Lock tag, because locking is permanent.

## Thank-you notes

In this demo, the kid's thank-you is saved to the gifter's gift page and isn't emailed. A real launch would send it to the email on the gifter's PayPal account.

## Add a skin

A skin is the look of a kid's gift. Add an entry to `SKINS` and its ID to `SKIN_IDS` in `src/lib/skins.ts`, and it appears in the gifter's picker and on the kid's pages. Boy or girl suggests a skin and sets the chat's wording. It isn't sent to the AI.

## Before a real launch

The gifter's money waits for the kid's choice, so check whether stored-value or gift-card rules apply. This doesn't affect the sandbox demo.

## License

MIT
