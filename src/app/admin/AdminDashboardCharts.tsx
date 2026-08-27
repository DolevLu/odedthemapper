"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { FinancialSummary, UsageSummary, Recommendation } from "@/lib/admin/analytics";

const COLORS = ["#7C3AED", "#EC4899", "#F59E0B", "#0EA5E9", "#22C55E", "#EF4444", "#8B5CF6", "#14B8A6"];

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs opacity-50">ללא שינוי</span>;
  const up = pct > 0;
  return (
    <span className="text-xs font-bold" style={{ color: up ? "#16A34A" : "#DC2626" }}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend?: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-black/10 bg-white p-4">
      <span className="text-xs font-medium opacity-60">{label}</span>
      <span className="text-2xl font-extrabold">{value}</span>
      {trend !== undefined && <TrendBadge pct={trend} />}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      <div style={{ width: "100%", height: 260 }}>{children}</div>
    </div>
  );
}

export function AdminDashboardCharts({
  financial,
  usage,
  recommendations,
}: {
  financial: FinancialSummary;
  usage: UsageSummary;
  recommendations: Recommendation[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-lg font-bold">💰 פיננסי</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="הכנסה כוללת" value={`₪${financial.totalRevenueIls.toLocaleString()}`} />
          <StatCard label="הכנסה חודשית (MRR)" value={`₪${financial.mrrIls.toLocaleString()}`} trend={financial.revenueGrowthPct} />
          <StatCard label="מנויים פעילים" value={String(financial.activeSubscriptionCount)} />
          <StatCard label="רכישות החודש" value={String(financial.purchasesByMonth.at(-1)?.purchases ?? 0)} trend={financial.purchaseGrowthPct} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="הכנסה חודשית (₪) - 12 חודשים אחרונים">
            <ResponsiveContainer>
              <LineChart data={financial.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0000000f" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => [`₪${Number(v).toLocaleString()}`, "הכנסה"]} />
                <Line type="monotone" dataKey="revenueIls" stroke="#7C3AED" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="רכישות חדשות לפי חודש">
            <ResponsiveContainer>
              <BarChart data={financial.purchasesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0000000f" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="purchases" fill="#EC4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="תמהיל תוכניות (מנויים פעילים)">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={financial.planMix} dataKey="count" nameKey="plan" outerRadius={90} label>
                  {financial.planMix.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="מקור הרכישות">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={financial.purchaseSource} dataKey="count" nameKey="source" outerRadius={90} label>
                  {financial.purchaseSource.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="סוגי יעדים נרכשים">
            <ResponsiveContainer>
              <BarChart data={financial.destinationTypeMix} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#0000000f" />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="type" fontSize={11} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          {financial.promoCodeStats.length > 0 && (
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold">קודי קופון שנוצלו בפועל</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-start opacity-60">
                    <th className="p-1.5 text-start">קוד</th>
                    <th className="p-1.5 text-start">שותף</th>
                    <th className="p-1.5 text-start">הנחה</th>
                    <th className="p-1.5 text-start">שימושים</th>
                  </tr>
                </thead>
                <tbody>
                  {financial.promoCodeStats.map((p) => (
                    <tr key={p.code} className="border-b border-black/5">
                      <td className="p-1.5 font-mono font-semibold">{p.code}</td>
                      <td className="p-1.5">{p.partnerName ?? "—"}</td>
                      <td className="p-1.5">{p.discountPercent}%</td>
                      <td className="p-1.5">{p.useCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">📊 שימוש</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="סה״כ משתמשים" value={String(usage.totalUsers)} />
          <StatCard label="הרשמות (7 ימים)" value={String(usage.signupsLast7)} trend={usage.signupTrendPct} />
          <StatCard label="פעילות (7 ימים)" value={String(usage.activityLast7)} trend={usage.activityTrendPct} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="הרשמות משתמשים לפי חודש">
            <ResponsiveContainer>
              <BarChart data={usage.signupsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0000000f" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="signups" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="פעילות לפי יום בשבוע">
            <ResponsiveContainer>
              <BarChart data={usage.activityByWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0000000f" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="פעילות לפי שעה ביום">
            <ResponsiveContainer>
              <LineChart data={usage.activityByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0000000f" />
                <XAxis dataKey="hour" fontSize={9} interval={2} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="events" stroke="#0EA5E9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="קטגוריות פופולריות (לפי מועדפים)">
            <ResponsiveContainer>
              <BarChart data={usage.topCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#0000000f" />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="category" fontSize={11} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {recommendations.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">💡 המלצות</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-xl border border-black/10 bg-white p-3 text-sm">
                <span className="text-lg">{r.icon}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
