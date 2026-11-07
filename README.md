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

## How the AI works

Claude does two jobs, and the kid never talks to it.

- **Shopping chat (Claude Haiku 5.5):** a tool-using agent that saves the gifter's rules, searches real products through Channel3, and proposes 3 to 5 gifts with a reason for each. See `src/lib/shopper.ts`.
- **Wrapping paper (Claude Sonnet 5.5):** after payment, it draws two simple shapes per gift that hint at what's inside without showing it. See `src/lib/wraps.ts`.

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

## Run locally

```bash
npm install
cp .env.example .env   # then fill in the keys
npm run dev
```

## Test Channel3 search

```bash
npm run channel3:test
```

Set `QUERY` and `MAX_PRICE` to try other searches.

## Deploy

`render.yaml` defines the web service and Postgres database. Create a Blueprint from this repo in Render and fill in the prompted keys.

## License

MIT

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
