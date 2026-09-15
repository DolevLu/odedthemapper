"use client";

import { useEffect, useState } from "react";
import { convertCurrencyForWidget } from "@/lib/actions/trip";
import { CURRENCIES } from "@/lib/exchangeRates";
import { useTranslation } from "@/components/i18n/LanguageContext";

// Debounced so typing a number doesn't fire a lookup per keystroke.
const DEBOUNCE_MS = 400;

export function CurrencyConverterWidget() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("ILS");
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { t, lang } = useTranslation();
  const numberLocale = lang === "en" ? "en-US" : "he-IL";

  useEffect(() => {
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setResult(null);
      setRate(null);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      convertCurrencyForWidget(parsed, from, to)
        .then((res) => {
          setResult(res.result);
          setRate(res.rate);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [amount, from, to]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div
      className="flex flex-col gap-2 border p-2.5 sm:gap-3 sm:p-4"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <h2 className="text-xs font-bold sm:text-sm">{t("currency.title")}</h2>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-20 min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs sm:w-28 sm:flex-initial sm:px-3 sm:py-2 sm:text-sm"
          style={{ borderColor: "var(--primary)" }}
        />
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border px-1.5 py-1.5 text-xs sm:px-2 sm:py-2 sm:text-sm" style={{ borderColor: "var(--primary)" }}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <button
          onClick={swap}
          type="button"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs sm:h-8 sm:w-8 sm:text-sm"
          style={{ borderColor: "var(--primary)" }}
          aria-label={t("currency.swapDirection")}
          title={t("currency.swapDirection")}
        >
          ⇄
        </button>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border px-1.5 py-1.5 text-xs sm:px-2 sm:py-2 sm:text-sm" style={{ borderColor: "var(--primary)" }}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>
      <div className="text-sm font-bold sm:text-lg" style={{ color: "var(--primary)" }}>
        {loading ? t("currency.calculating") : result !== null ? `= ${result.toLocaleString(numberLocale, { maximumFractionDigits: 2 })} ${to}` : "-"}
      </div>
      {rate !== null && !loading && (
        <p className="text-[11px] opacity-50 sm:text-xs">
          {t("currency.rate")} 1 {from} = {rate.toLocaleString(numberLocale, { maximumFractionDigits: 4 })} {to}
        </p>
      )}
    </div>
  );
}
