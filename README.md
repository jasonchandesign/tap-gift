# Tap Gift

Tap Gift turns an NFC card or a shared link into a gift worth unwrapping. A gifter tells an AI what the kid loves and narrows the ideas down to a few. The gifter pays up front with PayPal for the priciest gift they kept. The kid taps the card, unwraps each one, and chooses, and a cheaper choice refunds the difference. Fulfillment is simulated: this runs in the PayPal sandbox and nothing is bought from the store.

Built for the PayPal AI Hackathon. Sandbox only.

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

## Before a real launch

The gifter's money waits for the kid's choice, so check whether stored-value or gift-card rules apply. This doesn't affect the sandbox demo.
