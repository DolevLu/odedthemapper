import { prisma } from "@/lib/prisma";
import { togglePromoCodeActive, deletePromoCode } from "@/lib/actions/adminPromoCodes";
import { CreatePromoCodeForm } from "./CreatePromoCodeForm";

const DATE_FMT = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", year: "numeric" });

export default async function AdminPromoCodesPage() {
  const promoCodes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-bold">קודי קופון</h1>
      <p className="mb-6 text-sm opacity-60">
        קודי הנחה שמשתמשים יכולים להזין בעמוד הרכישה - לשותפים, משפיענים או קמפיינים. אחוז ההנחה חל על מחיר המנוי.
      </p>

      <CreatePromoCodeForm />

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/5 text-start">
              <th className="p-3 text-start">קוד</th>
              <th className="p-3 text-start">הנחה</th>
              <th className="p-3 text-start">שותף</th>
              <th className="p-3 text-start">שימושים</th>
              <th className="p-3 text-start">תפוגה</th>
              <th className="p-3 text-start">סטטוס</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {promoCodes.map((p) => {
              const expired = p.expiresAt ? p.expiresAt.getTime() < Date.now() : false;
              const exhausted = p.maxUses != null && p.useCount >= p.maxUses;
              const effectivelyActive = p.active && !expired && !exhausted;
              return (
                <tr key={p.id} className="border-b border-black/5">
                  <td className="p-3 font-mono font-semibold">{p.code}</td>
                  <td className="p-3">{p.discountPercent}%</td>
                  <td className="p-3">{p.partnerName ?? "—"}</td>
                  <td className="p-3">
                    {p.useCount}
                    {p.maxUses != null ? ` / ${p.maxUses}` : ""}
                  </td>
                  <td className="p-3">{p.expiresAt ? DATE_FMT.format(p.expiresAt) : "—"}</td>
                  <td className="p-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: effectivelyActive ? "#dcfce7" : "#f3f4f6" }}
                    >
                      {effectivelyActive ? "פעיל" : expired ? "פג תוקף" : exhausted ? "מוצה" : "מושבת"}
                    </span>
                  </td>
                  <td className="flex gap-2 p-3">
                    <form action={togglePromoCodeActive.bind(null, p.id, !p.active)}>
                      <button type="submit" className="text-xs font-medium underline opacity-70 hover:opacity-100">
                        {p.active ? "השבתה" : "הפעלה"}
                      </button>
                    </form>
                    <form action={deletePromoCode.bind(null, p.id)}>
                      <button type="submit" className="text-xs font-medium text-red-600 underline opacity-70 hover:opacity-100">
                        מחיקה
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {promoCodes.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center opacity-60">
                  אין עדיין קודי קופון.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
