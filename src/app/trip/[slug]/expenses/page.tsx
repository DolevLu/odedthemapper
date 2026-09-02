import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { addExpense, deleteExpense, setTripBudget } from "@/lib/actions/trip";
import { LoginPromptBanner } from "@/components/LoginPromptBanner";
import { CURRENCIES } from "@/lib/exchangeRates";
import { getGroupMembers } from "@/lib/access";
import { getSettleUpSummary } from "@/lib/costSplitting";
import { DailyRemaining } from "./DailyRemaining";
import { CurrencyConverterWidget } from "./CurrencyConverterWidget";

const CATEGORIES = ["אוכל", "תחבורה", "לינה", "אטרקציות", "קניות", "אחר"];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ExpensesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const userId = session?.user?.id;

  const [expenses, budget, groupMembers, settleUp] = userId
    ? await Promise.all([
        prisma.expense.findMany({ where: { userId, destinationId: destination.id }, orderBy: { spentAt: "desc" } }),
        prisma.tripBudget.findUnique({ where: { userId_destinationId: { userId, destinationId: destination.id } } }),
        getGroupMembers(userId),
        getSettleUpSummary(userId, destination.id),
      ])
    : [[], null, [], []];

  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0) / 100;
  const groups = new Map<string, typeof expenses>();
  for (const e of expenses) {
    const key = dayKey(e.spentAt);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const sortedDays = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  const totalBudget = budget ? budget.totalCents / 100 : null;
  const remaining = totalBudget !== null ? totalBudget - total : null;
  const dailyBudget = budget && budget.tripDays > 0 ? budget.totalCents / 100 / budget.tripDays : null;
  const todayKey = dayKey(new Date());
  const spentByDay = sortedDays.map((key) => ({
    date: key,
    total: (groups.get(key) ?? []).reduce((s, e) => s + e.amountCents, 0) / 100,
    label: new Date(key).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }),
  }));

  const addAction = addExpense.bind(null, destination.id, slug);
  const budgetAction = setTripBudget.bind(null, destination.id, slug);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <h1 className="text-base font-bold sm:text-xl">💸 הוצאות ותקציב</h1>

      <CurrencyConverterWidget />

      <div
        className="border p-2.5 sm:p-5"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        {userId ? (
          <form action={budgetAction} className="flex flex-wrap items-end gap-2 sm:gap-3">
            <label className="text-[11px] opacity-60 sm:text-xs">
              תקציב כולל (₪)
              <input
                name="totalBudget"
                type="number"
                step="1"
                min="0"
                defaultValue={budget ? budget.totalCents / 100 : ""}
                className="mt-1 block w-24 rounded-lg border px-2 py-1.5 text-xs sm:w-32 sm:px-3 sm:py-2 sm:text-sm"
                style={{ borderColor: "var(--primary)" }}
              />
            </label>
            <label className="text-[11px] opacity-60 sm:text-xs">
              מספר ימי טיול
              <input
                name="tripDays"
                type="number"
                min="1"
                defaultValue={budget?.tripDays ?? 1}
                className="mt-1 block w-16 rounded-lg border px-2 py-1.5 text-xs sm:w-24 sm:px-3 sm:py-2 sm:text-sm"
                style={{ borderColor: "var(--primary)" }}
              />
            </label>
            <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-sm" style={{ background: "var(--primary)" }}>
              שמירת תקציב
            </button>
          </form>
        ) : (
          <LoginPromptBanner slug={slug} path="/expenses" message="התחברו כדי להגדיר תקציב ולעקוב אחרי ההוצאות שלכם" />
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:mt-5 sm:grid-cols-4 sm:gap-3">
          <Stat label="סה״כ הוצאות" value={`₪${total.toFixed(0)}`} />
          <Stat label="תקציב כולל" value={totalBudget !== null ? `₪${totalBudget.toFixed(0)}` : "-"} />
          <Stat
            label="נשאר בתקציב"
            value={remaining !== null ? `₪${remaining.toFixed(0)}` : "—"}
            warn={remaining !== null && remaining < 0}
          />
          <DailyRemaining dailyBudget={dailyBudget} spentByDay={spentByDay} />
        </div>
      </div>

      {userId && (
        <form
          action={addAction}
          className="grid grid-cols-2 gap-2 border p-2.5 sm:grid-cols-5 sm:gap-3 sm:p-4"
          style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
        >
          <select name="category" className="rounded-lg border px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" style={{ borderColor: "var(--primary)" }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="סכום"
              required
              className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm"
              style={{ borderColor: "var(--primary)" }}
            />
            <select name="currency" defaultValue="ILS" className="shrink-0 rounded-lg border px-1.5 py-1.5 text-xs sm:px-2 sm:py-2 sm:text-sm" style={{ borderColor: "var(--primary)" }} title="ההוצאה תומר אוטומטית לשקלים">
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          <input name="spentAt" type="date" defaultValue={todayKey} className="rounded-lg border px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" style={{ borderColor: "var(--primary)" }} />
          <input name="note" placeholder="הערה" className="rounded-lg border px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" style={{ borderColor: "var(--primary)" }} />
          <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-semibold text-white sm:px-4 sm:py-2 sm:text-base" style={{ background: "var(--primary)" }}>
            הוספה
          </button>

          {groupMembers.length > 0 && (
            <div className="col-span-full flex flex-wrap items-center gap-1.5 border-t pt-2 sm:gap-2 sm:pt-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
              <span className="text-[11px] font-semibold opacity-60 sm:text-xs">💰 פיצול ההוצאה עם:</span>
              {groupMembers.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] sm:px-3 sm:py-1 sm:text-xs" style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                  <input type="checkbox" name="splitWith" value={m.id} />
                  {m.name ?? m.email}
                </label>
              ))}
            </div>
          )}
        </form>
      )}

      {settleUp.length > 0 && (
        <div
          className="flex flex-col gap-1.5 border p-2.5 sm:gap-2 sm:p-4"
          style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
        >
          <h2 className="text-xs font-bold sm:text-sm">🤝 התחשבנות עם חברי הקבוצה</h2>
          {settleUp.map((e) => (
            <div key={e.userId} className="flex items-center justify-between text-xs sm:text-sm">
              <span>{e.name}</span>
              <span className="font-semibold" style={{ color: e.netCents > 0 ? "#16A34A" : "#DC2626" }}>
                {e.netCents > 0 ? `חייב/ת לכם ₪${(e.netCents / 100).toFixed(0)}` : `אתם חייבים ₪${(Math.abs(e.netCents) / 100).toFixed(0)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-5">
        {sortedDays.map((key) => {
          const dayExpenses = groups.get(key)!;
          const dayTotal = dayExpenses.reduce((s, e) => s + e.amountCents, 0) / 100;
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between sm:mb-2">
                <h3 className="text-xs font-bold opacity-70 sm:text-sm">{new Date(key).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</h3>
                <span className="text-xs font-semibold sm:text-sm">₪{dayTotal.toFixed(0)}</span>
              </div>
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {dayExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between border p-2 sm:p-3"
                    style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
                  >
                    <div className="min-w-0 text-xs sm:text-sm">
                      <span className="font-semibold">₪{(e.amountCents / 100).toFixed(0)}</span>
                      {e.originalCurrency && e.originalAmountCents != null && (
                        <span className="ms-1 text-[11px] opacity-50 sm:text-xs">
                          (הומר מ-{(e.originalAmountCents / 100).toFixed(2)} {e.originalCurrency})
                        </span>
                      )}
                      <span className="ms-2 opacity-60">
                        {e.category}
                        {e.note ? ` · ${e.note}` : ""}
                      </span>
                    </div>
                    <form action={deleteExpense.bind(null, e.id, slug)}>
                      <button className="shrink-0 text-xs opacity-60 underline sm:text-sm">מחיקה</button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-sm font-extrabold sm:text-lg" style={{ color: warn ? "#DC2626" : "var(--primary)" }}>
        {value}
      </div>
      <div className="text-[10px] opacity-60 sm:text-xs">{label}</div>
    </div>
  );
}
