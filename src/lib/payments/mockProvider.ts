import type { PaymentProvider } from "./types";

/**
 * Dev/test-mode payment provider: sends the user to an in-app page that
 * simulates a subscription checkout instead of a real payment gateway. Swap
 * this file's export in `index.ts` for a PayMe adapter implementing the same
 * `PaymentProvider` interface once real merchant credentials are available —
 * nothing else in the app needs to change.
 */
export const mockProvider: PaymentProvider = {
  async createCheckoutUrl({ subscriptionId }) {
    return `/subscribe/mock/${subscriptionId}`;
  },
};
