import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { addExpense, deleteExpense, setTripBudget } from "@/lib/actions/trip";
import { DailyRemaining } from "./DailyRemaining";

const CATEGORIES = ["אוכל", "תחבורה", "לינה", "אטרקציות", "קניות", "אחר"];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ExpensesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  if (!destination) notFound();

  const session = await auth();
  const userId = session!.user!.id;

  const [expenses, budget] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, destinationId: destination.id },
      orderBy: { spentAt: "desc" },
    }),
    prisma.tripBudget.findUnique({ where: { userId_destinationId: { userId, destinationId: destination.id } } }),
  ]);

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
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">💸 הוצאות ותקציב</h1>

      <div
        className="border p-5"
        style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
      >
        <form action={budgetAction} className="flex flex-wrap items-end gap-3">
          <label className="text-xs opacity-60">
            תקציב כולל ($)
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

        <div className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <Stat label="סה״כ הוצאות" value={`$${total.toFixed(0)}`} />
          <Stat label="תקציב כולל" value={totalBudget !== null ? `$${totalBudget.toFixed(0)}` : "—"} />
          <Stat
            label="נשאר בתקציב"
            value={remaining !== null ? `$${remaining.toFixed(0)}` : "—"}
            warn={remaining !== null && remaining < 0}
          />
          <DailyRemaining dailyBudget={dailyBudget} spentByDay={spentByDay} />
        </div>
      </div>

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
        <input name="amount" type="number" step="0.01" min="0" placeholder="סכום $" required className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        <input name="spentAt" type="date" defaultValue={todayKey} className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        <input name="note" placeholder="הערה" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--primary)" }} />
        <button type="submit" className="rounded-full px-4 py-2 font-semibold text-white" style={{ background: "var(--primary)" }}>
          הוספה
        </button>
      </form>

      <div className="flex flex-col gap-5">
        {sortedDays.map((key) => {
          const dayExpenses = groups.get(key)!;
          const dayTotal = dayExpenses.reduce((s, e) => s + e.amountCents, 0) / 100;
          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold opacity-70">{new Date(key).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</h3>
                <span className="text-sm font-semibold">${dayTotal.toFixed(0)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {dayExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between border p-3"
                    style={{ borderRadius: "var(--radius)", borderColor: "var(--primary)", background: "var(--surface)" }}
                  >
                    <div>
                      <span className="font-semibold">${(e.amountCents / 100).toFixed(0)}</span>
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
