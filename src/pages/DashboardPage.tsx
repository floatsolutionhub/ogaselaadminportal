import { Users, ListPlus, Megaphone, ShieldCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDashboard } from "../services/admin";
import { useApiQuery } from "../lib/useApiQuery";
import { formatKobo, formatNumber, formatPercent } from "../lib/format";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";

export function DashboardPage() {
  const { data, isLoading, error } = useApiQuery(() => getDashboard());

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorBanner message={error ?? "Could not load the dashboard."} />;
  }

  const funnel = data.verificationFunnel;
  const funnelData = [
    { stage: "Not started", count: funnel.notStarted },
    { stage: "Pending", count: funnel.pending },
    { stage: "Manual review", count: funnel.manualReview },
    { stage: "Verified", count: funnel.verified },
    { stage: "Failed", count: funnel.failed },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active users (24h)"
          value={formatNumber(data.activeUsersLast24h)}
          hint={`${formatNumber(data.activeUsersLast30d)} in the last 30 days`}
          icon={Users}
        />
        <StatCard
          label="Listings created (24h)"
          value={formatNumber(data.listingsCreatedLast24h)}
          hint={`${formatNumber(data.listingsCreatedLast30d)} in the last 30 days`}
          icon={ListPlus}
        />
        <StatCard
          label="Ad-boost adoption"
          value={formatPercent(data.adBoostAdoptionRate)}
          hint="of listings eligible for ad push"
          icon={Megaphone}
        />
        <StatCard
          label="Verification pass rate"
          value={formatPercent(funnel.verifiedRate)}
          hint={`${formatPercent(funnel.failedRate)} failed`}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-ink">Revenue by plan</h2>
          <p className="mb-4 text-xs text-ink-muted">Successful plan-purchase transactions, all time.</p>
          {data.revenueByPlan.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">No plan purchases yet.</p>
          ) : (
            <div className="space-y-3">
              {data.revenueByPlan.map((row) => (
                <div key={row.plan} className="flex items-center justify-between border-b border-black/5 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{row.plan}</p>
                    <p className="text-xs text-ink-muted">{formatNumber(row.purchaseCount)} purchases</p>
                  </div>
                  <p className="text-sm font-semibold text-brand-700">{formatKobo(row.revenueKobo)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink">Verification funnel</h2>
          <p className="mb-4 text-xs text-ink-muted">Sellers by current verification status.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e9e6" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#eaf5f0" }} contentStyle={{ borderRadius: 8, borderColor: "#e6e9e6", fontSize: 12 }} />
                <Bar dataKey="count" fill="#0b6e4f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
