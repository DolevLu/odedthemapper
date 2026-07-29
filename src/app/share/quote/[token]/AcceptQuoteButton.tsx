"use client";

import { useState } from "react";
import { acceptPriceQuote } from "@/lib/actions/quotes";

export function AcceptQuoteButton({ token, alreadyAccepted }: { token: string; alreadyAccepted: boolean }) {
  const [accepted, setAccepted] = useState(alreadyAccepted);
  const [loading, setLoading] = useState(false);

  if (accepted) {
    return (
      <div className="print:hidden rounded-xl border-2 p-4 text-center font-semibold" style={{ borderColor: "#16A34A", color: "#16A34A" }}>
        ✅ ההצעה אושרה על ידכם
      </div>
    );
  }

  return (
    <div className="print:hidden flex flex-col items-center gap-3 rounded-xl border p-5 text-center" style={{ borderColor: "#1A1A1A22" }}>
      <p className="text-sm opacity-70">
        אישור זה מהווה הסכמה עקרונית להצעה בלבד, ואינו מהווה חתימה אלקטרונית מאושרת כחוק. פרטים סופיים ותנאי התקשרות
        ייסגרו ישירות מול נותן השירות.
      </p>
      <button
        onClick={async () => {
          setLoading(true);
          await acceptPriceQuote(token);
          setAccepted(true);
          setLoading(false);
        }}
        disabled={loading}
        className="rounded-full px-6 py-3 font-bold text-white disabled:opacity-50"
        style={{ background: "#16A34A" }}
      >
        {loading ? "שולח..." : "✅ אישור וחתימה עקרונית"}
      </button>
    </div>
  );
}
