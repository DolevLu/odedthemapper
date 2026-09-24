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

  const field = "rounded-xl border px-3 py-2.5 text-base";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} w-full min-w-0 flex-1`} style={{ borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
        <select value={from} onChange={(e) => setFrom(e.target.value)} className={field} style={{ borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={swap} type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }} aria-label={t("currency.swapDirection")} title={t("currency.swapDirection")}>
          ⇅
        </button>
        <div className="min-w-0 flex-1 truncate text-2xl font-extrabold" style={{ color: "var(--primary)" }}>
          {loading ? t("currency.calculating") : result !== null ? result.toLocaleString(numberLocale, { maximumFractionDigits: 2 }) : "-"}
        </div>
        <select value={to} onChange={(e) => setTo(e.target.value)} className={field} style={{ borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>
      {rate !== null && !loading && (
        <p className="text-xs opacity-50">
          {t("currency.rate")} 1 {from} = {rate.toLocaleString(numberLocale, { maximumFractionDigits: 4 })} {to}
        </p>
      )}
    </div>
  );
}
