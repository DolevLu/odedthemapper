import { getFinancialSummary, getUsageSummary, getMarketingRecommendations } from "@/lib/admin/analytics";
import { AdminDashboardCharts } from "./AdminDashboardCharts";

export default async function AdminDashboardPage() {
  const [financial, usage] = await Promise.all([getFinancialSummary(), getUsageSummary()]);
  const recommendations = getMarketingRecommendations(financial, usage);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold">לוח בקרה</h1>
      <AdminDashboardCharts financial={financial} usage={usage} recommendations={recommendations} />
    </div>
  );
}
