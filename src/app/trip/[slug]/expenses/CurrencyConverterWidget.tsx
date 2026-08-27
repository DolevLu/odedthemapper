"use client";

import { useEffect, useState } from "react";
import { convertCurrencyForWidget } from "@/lib/actions/trip";
import { CURRENCIES } from "@/lib/exchangeRates";

// Debounced so typing a number doesn't fire a lookup per keystroke.
const DEBOUNCE_MS = 400;

export function CurrencyConverterWidget() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("ILS");
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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
      className="flex flex-col gap-3 border p-4"
      style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
    >
      <h2 className="text-sm font-bold">💱 ממיר מטבעות</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--primary)" }}
        />
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border px-2 py-2 text-sm" style={{ borderColor: "var(--primary)" }}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <button
          onClick={swap}
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm"
          style={{ borderColor: "var(--primary)" }}
          aria-label="החלפת כיוון"
          title="החלפת כיוון"
        >
          ⇄
        </button>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border px-2 py-2 text-sm" style={{ borderColor: "var(--primary)" }}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>
      <div className="text-lg font-bold" style={{ color: "var(--primary)" }}>
        {loading ? "מחשב..." : result !== null ? `= ${result.toLocaleString("he-IL", { maximumFractionDigits: 2 })} ${to}` : "-"}
      </div>
      {rate !== null && !loading && <p className="text-xs opacity-50">שער: 1 {from} = {rate.toLocaleString("he-IL", { maximumFractionDigits: 4 })} {to}</p>}
    </div>
  );
}
