"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white"
      style={{ background: "#1A1A1A" }}
    >
      🖨️ הדפסה / שמירה כ-PDF
    </button>
  );
}
