import {
  Client,
  Environment,
  ExperienceContextShippingPreference,
  PaypalPaymentTokenCustomerType,
  PaypalPaymentTokenUsageType,
  UsagePattern,
  VaultController,
  VaultTokenRequestType,
} from "@paypal/paypal-server-sdk";
import { randomUUID } from "node:crypto";

let vault: VaultController | undefined;

function vaultApi() {
  vault ??= new VaultController(
    new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID ?? "",
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
      },
      environment: Environment.Sandbox,
      timeout: 15_000,
    }),
  );
  return vault;
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
