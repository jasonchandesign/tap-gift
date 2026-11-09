# Tap Gift

**A gift they get to choose, wrapped like a surprise.**

An adult picks a few real gifts with an AI shopper and pays once with PayPal. The kid unwraps every one on their phone, keeps the one they love, and the adult gets back whatever it didn't cost. The gift can live on a reusable NFC card or go out as a link.

Built for the PayPal AI Hackathon. Everything runs in the PayPal sandbox, and nothing is really bought or shipped.

- **Demo video (2:38):** https://youtu.be/fh6QKQtwcVo
- **Digital only (a gift link):** https://tap-gift.onrender.com
- **Tap card experience (a pretend card):** https://tap-gift.onrender.com/c/demo

## The problem

Buying for a kid usually means guessing. Ask a 13-year-old what they want and you get "I don't know." Guess wrong and the gift sits in a drawer, or someone deals with a return. The safe fallback is a gift card. It lets them choose, but it shows no thought and has nothing to open, and the kid can spend it on anything, including things the adult wouldn't buy.

So adults pick between a gift that feels personal and one the kid actually wants.

## The solution

Tap Gift lets the adult make the choices that matter and leaves the last pick to the kid.

1. **The gifter shops with an AI.** They tell a chat what the kid is into ("skateboarding", "getting into photography", "something under $50"). It searches real, in-stock products and explains each pick. The gifter adds two or three options at different prices, and chooses sizes as they go, so the kid only chooses things like color.
2. **They pay once.** The checkout shows each gift's price, its store's shipping and the sales tax. The gifter pays enough to cover the costliest one with PayPal.
3. **The kid opens it.** They tap the card with their phone, or open the link. No app or account is needed. Each gift is wrapped in paper the AI drew as a clue to what's inside, and the kid tears it open with a finger. They flip through colors, then keep one and send a thank-you.
4. **The balance comes back.** The chosen gift's price, shipping and tax come out, and PayPal refunds the rest to the gifter automatically. The gifter's page shows a receipt and the kid's note.
5. **The card is reused.** Once the gift is chosen, the same card can be cleared and used for the next birthday or holiday.

## Try it

Use a phone if you can; a computer works too. No physical card is needed, and each person creates their own gift.

| Experience | Start here | How the kid opens it |
| --- | --- | --- |
| **Digital only** | https://tap-gift.onrender.com | A gift link, shared by text or email |
| **Tap card** | https://tap-gift.onrender.com/c/demo | A pretend blank card, as if you'd just tapped a real one |

1. Tap **Start a gift**, enter a kid's name and age, and pick a wrap.
2. Tell the chat what the kid loves, then refine it, e.g. "under $30" or "no screens".
3. Add two or three gifts at different prices and check out.
4. Pay with a PayPal sandbox buyer account. The logins are in the Devpost testing instructions. No real money moves.
5. On the last page, **Demo notes** slide down from the top. Their button opens the gift as the kid would get it: **Open it as Sam** for a link, or **Tap the card as Sam** for a card.
6. Tear open each gift, then choose one. Pick a cheaper one to see the refund.
7. Go back to the first tab for the receipt, the refund and the thank-you note.

Real NFC cards are tested on iPhone. Android usually opens a card's link too, but that's untested, so use the link there.

## How it works

Next.js 16 on Render with Postgres. Claude runs the AI, Channel3 provides product search, and the PayPal Server SDK handles payments.

```
Gifter ── chat ──▶ Claude Haiku (tool use) ──▶ Channel3 search ──▶ rules in code ──▶ 3–5 picks
       ── pay ───▶ PayPal Orders API (capture: item + shipping + tax)
                    └▶ Claude Sonnet draws a wrapping paper for each gift
Kid ──── tap/link ▶ unwrap, choose ──▶ order recorded ──▶ PayPal Payments API refund of the rest
```

### The AI shopper, and the limits it can't break

- **Shopping agent** (Claude Haiku 5.5, `src/lib/shopper.ts`): a tool-using agent that saves the gifter's rules, searches Channel3 and proposes 3 to 5 gifts with a reason for each. It can only propose products that came back from a search in that same turn, so it can't invent one.
- **Hard limits live in code, not the prompt** (`src/lib/rules.ts`): price, in stock, new condition, US stores, blocked categories, things to avoid and size.
  - A dollar amount in the gifter's message becomes a limit in code, even if the model misses it.
  - Some limits follow the kid's age, e.g. makeup opens up at 13 and fragrance at 18.
- **Suggestion chips:** the tappable ideas start from a fixed list per age group. AI-written follow-ups are filtered for length, money talk and off-limits topics.
- **Per-gift budget:** each gift gets 20 AI turns.
- **Wrapping paper** (Claude Sonnet 5.5, `src/lib/wraps.ts`): after payment, it names the family each gift belongs to and draws four silhouettes from it, such as a t-shirt, sock, cap and trousers for clothing. The paper hints at what's inside without giving it away.
- **Eval** (`npm run eval`): 30 scripted chats, including requests for things the rules block (a knife, makeup for a young kid, a gift card). The latest run had **0 rule violations across 250 options**. A separate Claude review flags softer issues, like a reason claiming a detail the listing doesn't show, about 4% of the time.

### How the money moves

- **Cost of each gift** (`src/lib/costs.ts`): at checkout each gift gets a cost: price, the store's shipping and the ship-to state's sales tax. Channel3 provides prices but not shipping or tax, so both are estimates (free shipping from $50, otherwise $5.99, and the state's base rate).
- **One charge** (`src/lib/paypal.ts`): the Orders API charges the highest of those costs. It's sent to PayPal as item, shipping and tax, so PayPal's own checkout shows the same breakdown. Each gift's cost is saved for later.
- **Choosing** (`src/lib/checkout.ts`): the server rechecks that the product is still available. It then claims the gift in a single database update, so a double tap can't choose twice, and records the order.
- **Refund:** the chosen gift's saved cost is deducted, and the rest goes back through the Payments API as a refund on the original capture.
  - The refund uses a fixed request ID per gift, so a retry can never refund twice.
  - A failed refund stays owed, and is retried when the gifter opens their page.
- **No second charge:** the charge always covers the costliest gift, so a choice never needs more money. Charging up front and refunding also beats a PayPal authorization, whose hold lasts about 3 days, at most 29 with a reauthorization, while a kid may take weeks to open a gift.

### The card

- **What's on it:** a card is a plain NFC tag (NTAG215) holding one URL, `https://<app>/c/<card ID>`, with a random 16-character ID. Nothing runs on the card, and an iPhone opens the link in Safari with no app.
- **What a tap opens** (`src/app/c/[cardId]/route.ts`): a blank card starts a new gift on that card, and a card holding a gift opens it. A card holding an unopened gift can't be taken over by someone else's.
- **Written once:** the link on the card never changes, so a card is written once and never locked. Clearing a card after the kid chooses lets it carry the next gift, and leaves the order already placed untouched.

### Kids and privacy

The kid has no account, never talks to the AI and types nothing except an optional thank-you. An adult makes every decision about what's offered and pays for it. Opening a gift link changes nothing, so link previews and email scanners can't spend a gift. The kid's last name is used only for the shipping label.

### What's simulated, and what a real launch needs

- **Fulfillment is simulated.** The order is recorded, but nothing is bought from the store or shipped.
- **Shipping and tax are estimates.** A real launch would use each store's checkout or a tax service.
- **Thank-you notes** appear on the gifter's page; a real launch would email them.
- **Stored-value rules:** the gifter's money waits for the kid's choice, so check whether stored-value or gift-card rules apply.
- **Rate limits:** the live demo allows 10 new gifts and 40 chat turns per hour per IP.

## Built with

- **PayPal Server SDK:** Orders (capture with item, shipping and tax) and Payments (refunds), in the sandbox.
- **Claude API:** Haiku 5.5 for the shopping agent, Sonnet 5.5 for the wrapping paper.
- **Channel3:** real product search.
- **Next.js 16** on **Render** with Render Postgres. Locally it falls back to an embedded PGlite database.
- **Claude Code** built the app, with the **APIMatic Context Plugin for PayPal** for PayPal SDK context.

## Run it yourself

```bash
npm install
cp .env.example .env   # then fill in the keys
npm run dev
```

| Variable | What it's for |
| --- | --- |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | A PayPal sandbox app with Accept payments turned on |
| `ANTHROPIC_API_KEY` | The Claude API |
| `CHANNEL3_API_KEY` | Channel3 product search |
| `DATABASE_URL` | Postgres. Leave it blank to use PGlite locally |
| `APP_URL` | The app's public URL, used in card and gift links |

**Deploy:** `render.yaml` defines the web service and the database. Create a Blueprint from this repo in Render and fill in the prompted keys.

**Scripts** (from the repo root; PGlite allows one process at a time, so stop `npm run dev` first):

| Command | What it does |
| --- | --- |
| `npm run eval` | The shopping eval, against a running app |
| `npm run cards -- 10` | Prints 10 card links to write onto blank NFC cards with an app like NFC Tools. Don't lock them |
| `npm run channel3:test` | Runs one Channel3 search |
| `npx tsx --env-file=.env scripts/reset-gift.mts <gift link>` | Undoes a kid's choice so a test gift can be opened again |
| `npx tsx --env-file=.env scripts/redraw-wraps.mts <gift link>` | Draws a gift's wrapping paper again |

## Repo layout

| Path | What's there |
| --- | --- |
| `src/app` | Pages and API routes: the gifter's flow (`new`, `gifts/[id]`), the kid's gift (`g/[token]`), card taps (`c/[cardId]`) and PayPal (`api/paypal`) |
| `src/lib` | The shopping agent, rules, costs, PayPal, checkout and wrapping paper |
| `scripts` | The eval, card links and test helpers |
| `media/print` | Print files for the card and its rack backing |
| `video` | The demo video, edited in code with Remotion. See `video/README.md` |

## License

MIT
