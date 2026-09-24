import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { prisma } from "@/lib/prisma";
import { addExpense, deleteExpense, setTripBudget } from "@/lib/actions/trip";
import { LoginPromptBanner } from "@/components/LoginPromptBanner";
import { SheetLauncher } from "@/components/SheetLauncher";
import { CURRENCIES } from "@/lib/exchangeRates";
import { getGroupMembers } from "@/lib/access";
import { getSettleUpSummary } from "@/lib/costSplitting";
import { DailyRemaining } from "./DailyRemaining";
import { CurrencyConverterWidget } from "./CurrencyConverterWidget";
import { getLang, getServerT } from "@/lib/i18n/server";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

// The <option> value (and Expense.category stored in the DB) stays this
// fixed Hebrew string regardless of display language — only the label
// shown to the user is translated (see CATEGORY_KEY_BY_VALUE below).
const CATEGORIES: { value: string; labelKey: DictionaryKey; emoji: string; color: string }[] = [
  { value: "אוכל", labelKey: "expenses.category.food", emoji: "🍽️", color: "#F59E0B" },
  { value: "תחבורה", labelKey: "expenses.category.transport", emoji: "🚌", color: "#3B82F6" },
  { value: "לינה", labelKey: "expenses.category.lodging", emoji: "🛏️", color: "#8B5CF6" },
  { value: "אטרקציות", labelKey: "expenses.category.attractions", emoji: "🎟️", color: "#EC4899" },
  { value: "קניות", labelKey: "expenses.category.shopping", emoji: "🛍️", color: "#10B981" },
  { value: "אחר", labelKey: "expenses.category.other", emoji: "🧾", color: "#94A3B8" },
];
const CATEGORY_BY_VALUE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));
const OTHER = CATEGORIES[CATEGORIES.length - 1];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

const inputCls = "w-full rounded-xl border px-3 py-2.5 text-base";
const inputStyle = { borderColor: "color-mix(in srgb, var(--primary) 35%, transparent)", background: "var(--surface)" };

export default async function ExpensesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [destination, session] = await Promise.all([getDestinationBySlug(slug), auth()]);
  if (!destination) notFound();
  const userId = session?.user?.id;
  const [t, lang] = await Promise.all([getServerT(), getLang()]);
  const dateLocale = lang === "en" ? "en-GB" : "he-IL";

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
  const usedPct = totalBudget ? Math.min(100, Math.max(0, (total / totalBudget) * 100)) : 0;
  const barColor = remaining !== null && remaining < 0 ? "#F87171" : usedPct > 80 ? "#FBBF24" : "#86EFAC";
  const dailyBudget = budget && budget.tripDays > 0 ? budget.totalCents / 100 / budget.tripDays : null;
  const todayKey = dayKey(new Date());
  const spentByDay = sortedDays.map((key) => ({
    date: key,
    total: (groups.get(key) ?? []).reduce((s, e) => s + e.amountCents, 0) / 100,
    label: new Date(key).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" }),
  }));

  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountCents / 100);
  const categoryTotals = Array.from(byCategory.entries())
    .map(([value, amount]) => ({ cat: CATEGORY_BY_VALUE[value] ?? { ...OTHER, value }, amount }))
    .sort((a, b) => b.amount - a.amount);

  const addAction = addExpense.bind(null, destination.id, slug);
  const budgetAction = setTripBudget.bind(null, destination.id, slug);

  const budgetForm = (
    <form action={budgetAction} className="flex flex-col gap-3">
      <label className="text-sm font-semibold">
        {t("expenses.totalBudget")}
        <input name="totalBudget" type="number" step="1" min="0" inputMode="numeric" defaultValue={budget ? budget.totalCents / 100 : ""} className={`${inputCls} mt-1`} style={inputStyle} />
      </label>
      <label className="text-sm font-semibold">
        {t("expenses.tripDays")}
        <input name="tripDays" type="number" min="1" inputMode="numeric" defaultValue={budget?.tripDays ?? 1} className={`${inputCls} mt-1`} style={inputStyle} />
      </label>
      <button type="submit" className="mt-1 rounded-full py-3 text-base font-bold text-white" style={{ background: "var(--primary)" }}>
        {t("expenses.saveBudget")}
      </button>
    </form>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Hero: the one number that matters, and what's left of the budget */}
      <section
        className="relative overflow-hidden p-5 text-white shadow-md sm:p-6"
        style={{ borderRadius: "calc(var(--radius) + 8px)", background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, #000))" }}
      >
        <p className="text-sm opacity-80">{t("expenses.spentSoFar")}</p>
        <p className="mt-0.5 text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">₪{total.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}</p>

        {totalBudget !== null ? (
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, background: barColor }} />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-bold" style={remaining !== null && remaining < 0 ? { color: "#FECACA" } : undefined}>
                {remaining !== null && remaining < 0
                  ? `${t("expenses.overBudget")} ₪${Math.abs(remaining).toFixed(0)}`
                  : `${t("expenses.leftOfBudget")} ₪${(remaining ?? 0).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}`}
              </span>
              <span className="opacity-80">
                {t("expenses.ofBudget")} ₪{totalBudget.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        ) : userId ? (
          <p className="mt-3 text-sm opacity-80">{t("expenses.setBudgetCta")}</p>
        ) : null}

        {userId ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <SheetLauncher label={<>＋ {t("expenses.addExpense")}</>} title={t("expenses.addExpense")} variant="white" className="flex-1 sm:flex-none">
              <form action={addAction} className="flex flex-col gap-3">
                <label className="text-sm font-semibold">
                  {t("expenses.amountLabel")}
                  <div className="mt-1 flex gap-2">
                    <input name="amount" type="number" step="0.01" min="0" inputMode="decimal" placeholder="0" required className={`${inputCls} min-w-0 flex-1 text-2xl font-bold`} style={inputStyle} />
                    <select name="currency" defaultValue="ILS" className="shrink-0 rounded-xl border px-3 text-base" style={inputStyle} title={t("expenses.autoConvertTitle")}>
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <div>
                  <p className="mb-1.5 text-sm font-semibold">{t("expenses.categoryLabel")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((c, i) => (
                      <label key={c.value} className="cursor-pointer">
                        <input type="radio" name="category" value={c.value} defaultChecked={i === 0} className="peer sr-only" />
                        <span className="flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-xs font-semibold peer-checked:border-[color:var(--primary)] peer-checked:bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]" style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                          <span className="text-xl">{c.emoji}</span>
                          {t(c.labelKey)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="text-sm font-semibold">
                  {t("expenses.dateLabel")}
                  <input name="spentAt" type="date" defaultValue={todayKey} className={`${inputCls} mt-1`} style={inputStyle} />
                </label>
                <label className="text-sm font-semibold">
                  {t("expenses.noteLabel")}
                  <input name="note" placeholder={t("expenses.notePlaceholder")} className={`${inputCls} mt-1`} style={inputStyle} />
                </label>
                {groupMembers.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-sm font-semibold">{t("expenses.splitWith")}</p>
                    <div className="flex flex-wrap gap-2">
                      {groupMembers.map((m) => (
                        <label key={m.id} className="cursor-pointer">
                          <input type="checkbox" name="splitWith" value={m.id} className="peer sr-only" />
                          <span className="inline-block rounded-full border px-3 py-1.5 text-sm peer-checked:border-[color:var(--primary)] peer-checked:bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] peer-checked:font-semibold" style={{ borderColor: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                            {m.name ?? m.email}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <button type="submit" className="mt-1 rounded-full py-3 text-base font-bold text-white" style={{ background: "var(--primary)" }}>
                  {t("expenses.add")}
                </button>
              </form>
            </SheetLauncher>
            <SheetLauncher label={<>💱 {t("expenses.convertBtn")}</>} title={t("currency.title")} variant="onDark">
              <CurrencyConverterWidget />
            </SheetLauncher>
            <SheetLauncher label={<>✏️ {t(budget ? "expenses.editBudget" : "expenses.setBudgetCta")}</>} title={t("expenses.totalBudget")} variant="onDark">
              {budgetForm}
            </SheetLauncher>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white p-3 text-black">
            <LoginPromptBanner slug={slug} path="/expenses" message={t("expenses.loginPrompt")} />
          </div>
        )}
      </section>

      {userId && dailyBudget !== null && <DailyRemaining dailyBudget={dailyBudget} spentByDay={spentByDay} />}

      {/* Where the money went */}
      {categoryTotals.length > 0 && (
        <section className="rounded-2xl border p-4" style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)", background: "var(--surface)" }}>
          <h2 className="mb-2.5 text-sm font-bold">{t("expenses.byCategory")}</h2>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/5">
            {categoryTotals.map(({ cat, amount }) => (
              <div key={cat.value} style={{ width: `${(amount / (total || 1)) * 100}%`, background: cat.color }} />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {categoryTotals.map(({ cat, amount }) => (
              <li key={cat.value} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                  <span className="truncate">{CATEGORY_BY_VALUE[cat.value] ? t(cat.labelKey) : cat.value}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">₪{amount.toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {settleUp.length > 0 && (
        <section className="rounded-2xl border p-4" style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)", background: "var(--surface)" }}>
          <h2 className="mb-2 text-sm font-bold">{t("expenses.settleUpTitle")}</h2>
          <div className="flex flex-col divide-y" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
            {settleUp.map((e) => (
              <div key={e.userId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "var(--primary)" }}>
                    {(e.name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate font-medium">{e.name}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums" style={{ color: e.netCents > 0 ? "#16A34A" : "#DC2626" }}>
                  {e.netCents > 0
                    ? `${t("expenses.owesYouPrefix")} ₪${(e.netCents / 100).toFixed(0)}`
                    : `${t("expenses.youOwePrefix")} ₪${(Math.abs(e.netCents) / 100).toFixed(0)}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The ledger, day by day */}
      <div className="flex flex-col gap-5">
        {userId && sortedDays.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-sm opacity-60">{t("expenses.noExpensesYet")}</p>}
        {sortedDays.map((key) => {
          const dayExpenses = groups.get(key)!;
          const dayTotal = dayExpenses.reduce((s, e) => s + e.amountCents, 0) / 100;
          return (
            <section key={key}>
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h3 className="text-sm font-bold">{new Date(key).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}</h3>
                <span className="text-sm font-semibold tabular-nums opacity-70">₪{dayTotal.toFixed(0)}</span>
              </div>
              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)", background: "var(--surface)" }}>
                {dayExpenses.map((e, i) => {
                  const cat = CATEGORY_BY_VALUE[e.category] ?? { ...OTHER, value: e.category };
                  const catLabel = CATEGORY_BY_VALUE[e.category] ? t(cat.labelKey) : e.category;
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-3 py-2.5" style={i > 0 ? { borderTop: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" } : undefined}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: `color-mix(in srgb, ${cat.color} 20%, var(--surface))` }}>
                        {cat.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{e.note || catLabel}</p>
                        <p className="truncate text-xs opacity-55">
                          {e.note ? `${catLabel}` : ""}
                          {e.originalCurrency && e.originalAmountCents != null ? `${e.note ? " · " : ""}${(e.originalAmountCents / 100).toFixed(2)} ${e.originalCurrency}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-base font-bold tabular-nums">₪{(e.amountCents / 100).toFixed(0)}</span>
                      <form action={deleteExpense.bind(null, e.id, slug)} className="shrink-0">
                        <button className="flex h-8 w-8 items-center justify-center rounded-full text-sm opacity-40 hover:bg-black/5 hover:opacity-80" aria-label={t("expenses.delete")} title={t("expenses.delete")}>
                          ✕
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
