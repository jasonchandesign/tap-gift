// Proves the riskiest step: save PayPal with $0 charged, then charge it with no buyer present.
// Run with: npm run paypal:test
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com",
  USAGE_TYPE = "MERCHANT",
  AMOUNT = "25.00",
} = process.env;

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env first.");
  process.exit(1);
}
if (!PAYPAL_API_BASE.includes("sandbox")) {
  console.error("This script only runs against the PayPal sandbox.");
  process.exit(1);
}

async function paypal(path, { token, body, headers = {} }) {
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`POST ${path} failed with ${res.status}`);
    console.error(JSON.stringify(data, null, 2));
    console.error(`Debug ID: ${res.headers.get("paypal-debug-id")}`);
    process.exit(1);
  }
  return data;
}

async function getAccessToken() {
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Could not get an access token (${res.status}). Check the client ID and secret.`);
    process.exit(1);
  }
  return data.access_token;
}

const token = await getAccessToken();
console.log("1. Got an access token.");

const setup = await paypal("/v3/vault/setup-tokens", {
  token,
  headers: { "PayPal-Request-Id": randomUUID() },
  body: {
    payment_source: {
      paypal: {
        description: "Tap Gift saved account",
        usage_pattern: "IMMEDIATE",
        usage_type: USAGE_TYPE,
        customer_type: "CONSUMER",
        permit_multiple_payment_tokens: false,
        experience_context: {
          brand_name: "Tap Gift",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          return_url: "https://example.com/returnUrl",
          cancel_url: "https://example.com/cancelUrl",
        },
      },
    },
  },
});
const approveUrl = setup.links?.find((link) => link.rel === "approve")?.href;
console.log(`2. Created setup token ${setup.id} with usage_type ${USAGE_TYPE}.`);
if (!approveUrl) {
  console.error("No approve link came back:");
  console.error(JSON.stringify(setup, null, 2));
  process.exit(1);
}

console.log(`\n3. Open this link and log in as the sandbox buyer:\n\n${approveUrl}\n`);
console.log("Waiting up to 10 minutes for the approval...");
let status;
for (let i = 0; i < 200 && status !== "APPROVED"; i++) {
  await sleep(3000);
  const res = await fetch(`${PAYPAL_API_BASE}/v3/vault/setup-tokens/${setup.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (data.status !== status) console.log(`   Setup token status: ${data.status ?? res.status}`);
  status = data.status;
}
if (status !== "APPROVED") {
  console.error("The setup token was never approved.");
  process.exit(1);
}

const saved = await paypal("/v3/vault/payment-tokens", {
  token,
  headers: { "PayPal-Request-Id": randomUUID() },
  body: { payment_source: { token: { id: setup.id, type: "SETUP_TOKEN" } } },
});
console.log(`4. Saved the account. vault_id ${saved.id}, customer ${saved.customer?.id}.`);

const order = await paypal("/v2/checkout/orders", {
  token,
  headers: { "PayPal-Request-Id": randomUUID() },
  body: {
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: "USD", value: AMOUNT } }],
    payment_source: { paypal: { vault_id: saved.id } },
  },
});
console.log(`5. Created order ${order.id} with status ${order.status}.`);

let finished = order;
if (order.status !== "COMPLETED") {
  console.log("   The order didn't complete in one call, so capturing it separately.");
  finished = await paypal(`/v2/checkout/orders/${order.id}/capture`, {
    token,
    headers: { "PayPal-Request-Id": randomUUID() },
    body: {},
  });
}

const capture = finished.purchase_units?.[0]?.payments?.captures?.[0];
console.log(`6. Final status ${finished.status}. Capture ${capture?.id}: ${capture?.status}, $${capture?.amount?.value}.`);
console.log("\nCheck the sandbox business account for the payment.");
