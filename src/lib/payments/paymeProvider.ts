import type { PaymentProvider } from "./types";

/**
 * Real PayMe (Isracard) adapter. PayMe doesn't work like Stripe Checkout —
 * there's no simple "redirect to a hosted payment URL". Instead their SDK
 * mounts hosted card fields directly on your own page, tokenizes the card
 * client-side, then your backend exchanges that token for a charge via their
 * generate-sale API. So createCheckoutUrl here just points at our own
 * checkout page (/subscribe/payme/[subscriptionId]) which hosts those fields
 * — see PayMeCheckoutForm.tsx and /api/payme/charge for the rest of the flow.
 *
 * Built from PayMe's official JS SDK docs (github.com/PayMeService/payme-jsapi)
 * and their public sandbox/production URL docs (sandbox.payme.io/api).
 * NOT verified against a real PayMe merchant dashboard — their full API
 * reference is a JS-rendered site we couldn't access programmatically to
 * confirm every field name. Keep PAYME_TEST_MODE=true and run one real
 * sandbox transaction before flipping it off.
 */
export const paymeProvider: PaymentProvider = {
  async createCheckoutUrl({ subscriptionId }) {
    return `/subscribe/payme/${subscriptionId}`;
  },
};
