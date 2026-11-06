import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  ExperienceContextShippingPreference,
  PaypalPaymentTokenCustomerType,
  PaypalPaymentTokenUsageType,
  OrdersController,
  UsagePattern,
  VaultController,
  VaultTokenRequestType,
} from "@paypal/paypal-server-sdk";
import { randomUUID } from "node:crypto";
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

function vaultApi() {
  return new VaultController(paypal());
}

/** Starts saving a PayPal account with $0 charged. The buyer approves at the returned link. */
export async function createSetupToken(returnUrl: string, cancelUrl: string) {
  const { result } = await vaultApi().createSetupToken({
    paypalRequestId: randomUUID(),
    body: {
      paymentSource: {
        paypal: {
          description: "Tap Gift saved account",
          usagePattern: UsagePattern.Immediate,
          usageType: PaypalPaymentTokenUsageType.Merchant,
          customerType: PaypalPaymentTokenCustomerType.Consumer,
          permitMultiplePaymentTokens: false,
          experienceContext: {
            brandName: "Tap Gift",
            locale: "en-US",
            shippingPreference: ExperienceContextShippingPreference.NoShipping,
            returnUrl,
            cancelUrl,
          },
        },
      },
    },
  });

  const approveUrl = result.links?.find((link) => link.rel === "approve")?.href;
  if (!result.id || !approveUrl) throw new Error("PayPal returned no approval link");
  return { setupTokenId: result.id, approveUrl };
}

/** Exchanges an approved setup token for the saved account. Safe to retry with the same token. */
export async function savePaymentToken(setupTokenId: string) {
  const { result } = await vaultApi().createPaymentToken({
    paypalRequestId: setupTokenId,
    body: {
      paymentSource: {
        token: { id: setupTokenId, type: VaultTokenRequestType.SetupToken },
      },
    },
  });

  if (!result.id) throw new Error("PayPal returned no vault ID");
  return { vaultId: result.id, customerId: result.customer?.id ?? null };
}

/** Charges a saved account in one call. The request ID makes a retry of this order safe. */
export async function chargeSavedAccount(charge: {
  orderId: string;
  vaultId: string;
  amountCents: number;
  description: string;
  shipping: Shipping;
}) {
  const { shipping } = charge;
  const { result } = await new OrdersController(paypal()).createOrder({
    paypalRequestId: charge.orderId,
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          description: charge.description.slice(0, 120),
          amount: { currencyCode: "USD", value: (charge.amountCents / 100).toFixed(2) },
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
      paymentSource: { paypal: { vaultId: charge.vaultId } },
    },
  });

  const capture = result.purchaseUnits?.[0]?.payments?.captures?.[0];
  if (result.status !== "COMPLETED" || !result.id || !capture?.id) {
    throw new Error(`PayPal order ended with status ${result.status}`);
  }
  return { paypalOrderId: result.id, captureId: capture.id };
}
