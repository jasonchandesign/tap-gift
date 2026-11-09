import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  ItemCategory,
  OrdersController,
  PaymentsController,
  PaypalExperienceUserAction,
  PaypalWalletContextShippingPreference,
  RefundStatus,
} from "@paypal/paypal-server-sdk";
import { randomUUID } from "node:crypto";
import type { Cost } from "./costs";
import type { Shipping } from "./gifts";

let client: Client | undefined;

function paypal() {
  client ??= new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.PAYPAL_CLIENT_ID ?? "",
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
    },
    environment: Environment.Sandbox,
    timeout: 15_000,
  });
  return client;
}

function usd(cents: number) {
  return { currencyCode: "USD", value: (cents / 100).toFixed(2) };
}

/**
 * Starts a payment. Nothing is taken until the buyer approves and we capture the order.
 * The cost is split into item, shipping and tax, so PayPal's checkout shows the same breakdown.
 */
export async function createPayment(payment: {
  cost: Cost;
  item: { name: string; description: string };
  shipping: Shipping;
  returnUrl: string;
  cancelUrl: string;
}) {
  const { cost, shipping, returnUrl, cancelUrl } = payment;
  const { result } = await new OrdersController(paypal()).createOrder({
    paypalRequestId: randomUUID(),
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          description: "A Tap Gift",
          amount: {
            ...usd(cost.total_cents),
            breakdown: {
              itemTotal: usd(cost.item_cents),
              shipping: usd(cost.shipping_cents),
              taxTotal: usd(cost.tax_cents),
            },
          },
          items: [
            {
              // PayPal limits these to 127 characters.
              name: payment.item.name.slice(0, 127),
              description: payment.item.description.slice(0, 127),
              unitAmount: usd(cost.item_cents),
              tax: usd(cost.tax_cents),
              quantity: "1",
              category: ItemCategory.PhysicalGoods,
            },
          ],
          shipping: {
            name: { fullName: shipping.name },
            address: {
              addressLine1: shipping.line1,
              addressLine2: shipping.line2 || undefined,
              adminArea2: shipping.city,
              adminArea1: shipping.state.toUpperCase(),
              postalCode: shipping.zip,
              countryCode: "US",
            },
          },
        },
      ],
      paymentSource: {
        paypal: {
          experienceContext: {
            brandName: "Tap Gift",
            locale: "en-US",
            shippingPreference: PaypalWalletContextShippingPreference.SetProvidedAddress,
            userAction: PaypalExperienceUserAction.PayNow,
            returnUrl,
            cancelUrl,
          },
        },
      },
    },
  });

  const payerAction = result.links?.find(({ rel }) => rel === "payer-action")?.href;
  if (!result.id || !payerAction) throw new Error("PayPal returned no approval link");
  // On phones, /checkoutnow hands off to the PayPal app, which can't see sandbox orders. /pay is
  // the same checkout without that step. It isn't a documented link, so recheck it before live use.
  return { orderId: result.id, approveUrl: payerAction.replace("/checkoutnow", "/pay") };
}

/** Takes the money for an approved order. The request ID makes a retry of this order safe. */
export async function capturePayment(orderId: string) {
  const { result } = await new OrdersController(paypal()).captureOrder({
    id: orderId,
    paypalRequestId: orderId,
    prefer: "return=representation",
  });

  const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0];
  if (result.status !== "COMPLETED" || !capture?.id || !capture.amount) {
    throw new Error(`PayPal order ended with status ${result.status}`);
  }
  return { captureId: capture.id, paidCents: Math.round(Number(capture.amount.value) * 100) };
}

/** Sends money back. Repeating a request ID can't refund twice. */
export async function refundPayment(refund: {
  captureId: string;
  amountCents: number;
  requestId: string;
}) {
  const { result } = await new PaymentsController(paypal()).refundCapturedPayment({
    captureId: refund.captureId,
    paypalRequestId: refund.requestId,
    body: { amount: usd(refund.amountCents), noteToPayer: "Your Tap Gift refund" },
  });

  const failed = result.status === RefundStatus.Failed || result.status === RefundStatus.Cancelled;
  if (!result.id || failed) throw new Error(`PayPal refund ended with status ${result.status}`);
  return result.id;
}
