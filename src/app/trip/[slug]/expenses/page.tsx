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
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
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
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">💸 הוצאות ותקציב</h1>

      <CurrencyConverterWidget />

      <div
        className="border p-5"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        {userId ? (
          <form action={budgetAction} className="flex flex-wrap items-end gap-3">
            <label className="text-xs opacity-60">
              תקציב כולל (₪)
              <input
                name="totalBudget"
                type="number"
                step="1"
                min="0"
                defaultValue={budget ? budget.totalCents / 100 : ""}
                className="mt-1 block w-32 rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--primary)" }}
              />
            </label>
            <label className="text-xs opacity-60">
              מספר ימי טיול
              <input
                name="tripDays"
                type="number"
                min="1"
                defaultValue={budget?.tripDays ?? 1}
                className="mt-1 block w-24 rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--primary)" }}
              />
            </label>
            <button type="submit" className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
              שמירת תקציב
            </button>
          </form>
        ) : (
          <LoginPromptBanner slug={slug} path="/expenses" message="התחברו כדי להגדיר תקציב ולעקוב אחרי ההוצאות שלכם" />
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <Stat label="סה״כ הוצאות" value={`₪${total.toFixed(0)}`} />
          <Stat label="תקציב כולל" value={totalBudget !== null ? `₪${totalBudget.toFixed(0)}` : "—"} />
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
          className="grid grid-cols-1 gap-3 border p-4 sm:grid-cols-5"
          style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
        >
          <select name="category" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <input name="amount" type="number" step="0.01" min="0" placeholder="סכום" required className="min-w-0 flex-1 rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
            <select name="currency" defaultValue="ILS" className="shrink-0 rounded-lg border px-2 py-2 text-sm" style={{ borderColor: "var(--primary)" }} title="ההוצאה תומר אוטומטית לשקלים">
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          <input name="spentAt" type="date" defaultValue={todayKey} className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
          <input name="note" placeholder="הערה" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
          <button type="submit" className="rounded-full px-4 py-2 font-semibold text-white" style={{ background: "var(--primary)" }}>
            הוספה
          </button>

          {groupMembers.length > 0 && (
            <div className="col-span-full flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
              <span className="text-xs font-semibold opacity-60">💰 פיצול ההוצאה עם:</span>
              {groupMembers.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
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
          className="flex flex-col gap-2 border p-4"
          style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
        >
          <h2 className="text-sm font-bold">🤝 התחשבנות עם חברי הקבוצה</h2>
          {settleUp.map((e) => (
            <div key={e.userId} className="flex items-center justify-between text-sm">
              <span>{e.name}</span>
              <span className="font-semibold" style={{ color: e.netCents > 0 ? "#16A34A" : "#DC2626" }}>
                {e.netCents > 0 ? `חייב/ת לכם ₪${(e.netCents / 100).toFixed(0)}` : `אתם חייבים ₪${(Math.abs(e.netCents) / 100).toFixed(0)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {sortedDays.map((key) => {
          const dayExpenses = groups.get(key)!;
          const dayTotal = dayExpenses.reduce((s, e) => s + e.amountCents, 0) / 100;
          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold opacity-70">{new Date(key).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</h3>
                <span className="text-sm font-semibold">₪{dayTotal.toFixed(0)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {dayExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between border p-3"
                    style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
                  >
                    <div>
                      <span className="font-semibold">₪{(e.amountCents / 100).toFixed(0)}</span>
                      {e.originalCurrency && e.originalAmountCents != null && (
                        <span className="ms-1 text-xs opacity-50">
                          (הומר מ-{(e.originalAmountCents / 100).toFixed(2)} {e.originalCurrency})
                        </span>
                      )}
                      <span className="ms-2 text-sm opacity-60">
                        {e.category}
                        {e.note ? ` · ${e.note}` : ""}
                      </span>
                    </div>
                    <form action={deleteExpense.bind(null, e.id, slug)}>
                      <button className="text-sm opacity-60 underline">מחיקה</button>
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
      <div className="text-lg font-extrabold" style={{ color: warn ? "#DC2626" : "var(--primary)" }}>
        {value}
      </div>
      <div className="text-xs opacity-60">{label}</div>
    </div>
  );
}
