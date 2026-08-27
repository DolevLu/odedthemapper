"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    PayMe?: { create: (apiKey: string, opts: { testMode: boolean }) => Promise<PayMeInstance> };
  }
}

type PayMeField = { mount: (selector: string) => void };
type PayMeInstance = {
  hostedFields: () => { create: (type: string) => PayMeField };
  tokenize: (saleData: Record<string, unknown>) => Promise<{ token: string }>;
};

const SDK_URL = "https://cdn.payme.io/hf/v1/hostedfields.js";

export function PayMeCheckoutForm({
  subscriptionId,
  amountCents,
  currency,
  planName,
  payerEmail,
  payerName,
}: {
  subscriptionId: string;
  amountCents: number;
  currency: string;
  planName: string;
  payerEmail: string;
  payerName: string;
}) {
  const router = useRouter();
  const instanceRef = useRef<PayMeInstance | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, ...rest] = payerName.split(" ");
  const [form, setForm] = useState({
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    email: payerEmail,
    phone: "",
  });

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_PAYME_API_KEY;
    if (!apiKey) {
      setError("PayMe לא מוגדר - חסר מפתח API");
      return;
    }

    let cancelled = false;
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = async () => {
      try {
        const instance = await window.PayMe!.create(apiKey, {
          testMode: process.env.NEXT_PUBLIC_PAYME_TEST_MODE !== "false", // sandboxed by default until verified in a real PayMe test
        });
        if (cancelled) return;
        instanceRef.current = instance;
        const fields = instance.hostedFields();
        fields.create("cardNumber").mount("#payme-card-number");
        fields.create("cardExpiration").mount("#payme-card-expiration");
        fields.create("cvc").mount("#payme-cvc");
        setSdkReady(true);
      } catch {
        if (!cancelled) setError("לא הצלחנו לטעון את טופס התשלום של PayMe");
      }
    };
    script.onerror = () => setError("לא הצלחנו לטעון את טופס התשלום של PayMe");
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      document.body.removeChild(script);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instanceRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const tokenizationResult = await instanceRef.current.tokenize({
        payerFirstName: form.firstName,
        payerLastName: form.lastName,
        payerEmail: form.email,
        payerPhone: form.phone,
        total: {
          label: planName,
          amount: { currency, value: (amountCents / 100).toFixed(2) },
        },
      });

      const res = await fetch("/api/payme/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, token: tokenizationResult.token }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "התשלום נכשל, נסו שוב");
        setLoading(false);
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("התשלום נכשל, נסו שוב");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          placeholder="שם פרטי"
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="שם משפחה"
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </div>
      <input
        required
        type="email"
        placeholder="אימייל"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="טלפון"
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        className="rounded-lg border border-black/10 px-3 py-2 text-sm"
      />

      <div id="payme-card-number" className="h-11 rounded-lg border border-black/10 px-3 py-2" />
      <div className="grid grid-cols-2 gap-2">
        <div id="payme-card-expiration" className="h-11 rounded-lg border border-black/10 px-3 py-2" />
        <div id="payme-cvc" className="h-11 rounded-lg border border-black/10 px-3 py-2" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!sdkReady || loading}
        className="mt-2 w-full rounded-full px-4 py-3 font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
      >
        {loading ? "מעבד..." : sdkReady ? "שלם עכשיו" : "טוען טופס תשלום..."}
      </button>
      <p className="text-center text-xs opacity-50">התשלום מאובטח ומעובד ישירות על ידי PayMe.</p>
    </form>
  );
}
