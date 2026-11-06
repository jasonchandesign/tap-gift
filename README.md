# Tap Gift

Tap Gift turns an NFC card or a shared link into a holiday gift. A grandparent sets a budget and a note, the kid tells an AI shopper what they want, and a parent approves before PayPal charges the grandparent's saved account.

Built for the PayPal AI Hackathon. Sandbox only.

## Run locally

```bash
npm install
cp .env.example .env   # then fill in the keys
npm run dev
```

## Test the PayPal vault charge

This saves a sandbox buyer's PayPal with $0 charged, then charges the saved account with no buyer present. Open the link it prints and log in as the sandbox buyer. The script continues once PayPal reports the approval.

```bash
npm run paypal:test
```

Set `USAGE_TYPE=PLATFORM` to try the other `usage_type`, and `AMOUNT=10.00` to change the charge. The default is `MERCHANT` and `25.00`.

## Test Channel3 search

```bash
npm run channel3:test
```

Set `QUERY` and `MAX_PRICE` to try other searches.

## Deploy

`render.yaml` defines the web service and Postgres database. Create a Blueprint from this repo in Render and fill in the prompted keys.

## License

MIT
