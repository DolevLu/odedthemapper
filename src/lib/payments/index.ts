import { mockProvider } from "./mockProvider";
import { paymeProvider } from "./paymeProvider";
import type { PaymentProvider } from "./types";

export const paymentProvider: PaymentProvider = process.env.PAYME_API_KEY ? paymeProvider : mockProvider;
