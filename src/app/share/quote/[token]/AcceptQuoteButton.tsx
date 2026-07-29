"use client";

import { useState } from "react";
import { acceptPriceQuote } from "@/lib/actions/quotes";
import { SignaturePad } from "@/components/SignaturePad";

export function AcceptQuoteButton({ token, alreadyAccepted }: { token: string; alreadyAccepted: boolean }) {
  const [accepted, setAccepted] = useState(alreadyAccepted);
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (accepted) {
    return (
      <div className="print:hidden rounded-xl border-2 p-4 text-center font-semibold" style={{ borderColor: "#16A34A", color: "#16A34A" }}>
        ✅ ההצעה אושרה וחתומה על ידכם
      </div>
    );
  }

  return (
    <div className="print:hidden flex flex-col items-center gap-3 rounded-xl border p-5 text-center" style={{ borderColor: "#1A1A1A22" }}>
      <p className="text-sm opacity-70">
        חתימה זו היא רישום אמיתי של הסכמתכם להצעה, אך אינה חתימה אלקטרונית מאושרת כחוק. פרטים סופיים ותנאי התקשרות
        ייסגרו ישירות מול נותן השירות.
      </p>
      <div className="w-full max-w-sm">
        <SignaturePad onChange={setSignature} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={async () => {
          if (!signature) {
            setError("יש לחתום לפני האישור");
            return;
          }
          setError(null);
          setLoading(true);
          await acceptPriceQuote(token, signature);
          setAccepted(true);
          setLoading(false);
        }}
        disabled={loading}
        className="rounded-full px-6 py-3 font-bold text-white disabled:opacity-50"
        style={{ background: "#16A34A" }}
      >
        {loading ? "שולח..." : "✅ אישור וחתימה"}
      </button>
    </div>
  );
}
