export const CURRENCIES: { code: string; label: string }[] = [
  { code: "ILS", label: "₪ שקל" },
  { code: "USD", label: "$ דולר" },
  { code: "EUR", label: "€ יורו" },
  { code: "GBP", label: "£ לירה שטרלינג" },
  { code: "CZK", label: "Kč כתר צ'כי" },
  { code: "JPY", label: "¥ ין יפני" },
  { code: "THB", label: "฿ באט תאילנדי" },
  { code: "CNY", label: "¥ יואן סיני" },
  { code: "VND", label: "₫ דונג וייטנאמי" },
  { code: "PLN", label: "zł זלוטי פולני" },
  { code: "HUF", label: "Ft פורינט הונגרי" },
];

// Rough per-1-unit → ILS rates, used only when the live API is unreachable —
// good enough not to block logging an expense, not meant to stay accurate.
const FALLBACK_RATES_TO_ILS: Record<string, number> = {
  ILS: 1,
  USD: 3.7,
  EUR: 4.0,
  GBP: 4.7,
  CZK: 0.16,
  JPY: 0.024,
  THB: 0.1,
  CNY: 0.51,
  VND: 0.00015,
  PLN: 0.93,
  HUF: 0.01,
};

/** General any-currency-to-any-currency conversion (not anchored to ILS) —
 * powers the standalone converter widget. Same free API, same static
 * fallback philosophy, just parameterized on the target currency too. */
export async function convertCurrency(amount: number, from: string, to: string): Promise<{ result: number; rate: number }> {
  if (from === to) return { result: amount, rate: 1 };

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.[to];
      if (typeof rate === "number" && rate > 0) {
        return { result: amount * rate, rate };
      }
    }
  } catch {
    // fall through to the static fallback below
  }

  const fromToIls = FALLBACK_RATES_TO_ILS[from] ?? 1;
  const toToIls = FALLBACK_RATES_TO_ILS[to] ?? 1;
  const rate = fromToIls / toToIls;
  return { result: amount * rate, rate };
}

/** Converts an amount in `fromCurrency` to ILS agorot, via a free no-key
 * exchange-rate API (rates refreshed at most hourly), falling back to a
 * static approximate table on any failure so adding an expense never blocks
 * on a flaky third-party API. */
export async function convertToILS(amount: number, fromCurrency: string): Promise<{ amountCentsIls: number; rate: number }> {
  if (fromCurrency === "ILS") return { amountCentsIls: Math.round(amount * 100), rate: 1 };

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.ILS;
      if (typeof rate === "number" && rate > 0) {
        return { amountCentsIls: Math.round(amount * rate * 100), rate };
      }
    }
  } catch {
    // fall through to the static fallback below
  }

  const rate = FALLBACK_RATES_TO_ILS[fromCurrency] ?? 1;
  return { amountCentsIls: Math.round(amount * rate * 100), rate };
}
