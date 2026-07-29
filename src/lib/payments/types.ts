export type CreateCheckoutInput = {
  subscriptionId: string;
  planName: string;
  amountCents: number;
  currency: string;
};

export type PaymentProvider = {
  /** Returns the URL the browser should be sent to in order to pay. */
  createCheckoutUrl(input: CreateCheckoutInput): Promise<string>;
};
