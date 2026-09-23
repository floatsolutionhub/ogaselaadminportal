import { Link } from "react-router-dom";
import {
  Users,
  ListPlus,
  Megaphone,
  ShieldCheck,
  ShieldAlert,
  FileClock,
  ScrollText,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDashboard, getModerationQueue, getAuditLog } from "../services/admin";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { useVisibleNavItems } from "../lib/nav";
import { formatKobo, formatNumber, formatPercent, formatRelativeAge, formatDateTime } from "../lib/format";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";

export function DashboardPage() {
  const { user, isSuperAdmin } = useAuth();

  const canViewKpis = isSuperAdmin || user?.role === "FinanceAdmin";
  const canViewOps = isSuperAdmin || user?.role === "Moderator";
  const canViewAuditFeed = isSuperAdmin;

  const displayName = user?.name ?? user?.phone ?? user?.email ?? "there";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Welcome back, {firstName}</h2>
        <p className="text-sm text-ink-muted">
          {new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {canViewKpis ? <PlatformKpis /> : <RestrictedCard reason="Platform KPIs are visible to Finance Admins and Super Admins only." />}

      {(canViewOps || canViewAuditFeed) && (
        <div className={`grid grid-cols-1 gap-6 ${canViewOps && canViewAuditFeed ? "lg:grid-cols-2" : ""}`}>
          {canViewOps && <OperationsSnapshot />}
          {canViewAuditFeed && <RecentActivity />}
        </div>
      )}

      <QuickActions />
    </div>
  );
}

function PlatformKpis() {
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
          tone="brand"
        />
        <StatCard
          label="Listings created (24h)"
          value={formatNumber(data.listingsCreatedLast24h)}
          hint={`${formatNumber(data.listingsCreatedLast30d)} in the last 30 days`}
          icon={ListPlus}
          tone="violet"
        />
        <StatCard
          label="Ad-boost adoption"
          value={formatPercent(data.adBoostAdoptionRate)}
          hint="of listings eligible for ad push"
          icon={Megaphone}
          tone="amber"
        />
        <StatCard
          label="Verification pass rate"
          value={formatPercent(funnel.verifiedRate)}
          hint={`${formatPercent(funnel.failedRate)} failed`}
          icon={ShieldCheck}
          tone="sky"
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

/** Live snapshot of AdminController's unified moderation queue (open reports + pending biometric reviews). */
function OperationsSnapshot() {
  const { data, isLoading, error } = useApiQuery(() => getModerationQueue());

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Operations queue</h2>
          <p className="text-xs text-ink-muted">Open reports and pending identity checks needing action now.</p>
        </div>
        <Link to="/moderation" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
          View queue <ArrowRight size={13} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size={22} />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Queue is empty" description="Nothing needs moderator attention right now." />
      ) : (
        <div className="space-y-1">
          <div className="mb-3 flex gap-2">
            <Badge tone="danger">{data.filter((item) => item.type === "Report").length} reports</Badge>
            <Badge tone="warning">{data.filter((item) => item.type === "BiometricManualReview").length} manual reviews</Badge>
          </div>
          {data.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center gap-3 border-b border-black/5 py-2.5 last:border-0">
              {item.type === "Report" ? (
                <ShieldAlert size={16} className="flex-shrink-0 text-rose-500" />
              ) : (
                <FileClock size={16} className="flex-shrink-0 text-amber-500" />
              )}
              <p className="min-w-0 flex-1 truncate text-sm text-ink">{item.summary}</p>
              <span className="flex-shrink-0 text-xs text-ink-muted">{formatRelativeAge(item.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Live feed off AdminController's audit log - the same trail StaffPage/RolesPage/etc. actions write to. */
function RecentActivity() {
  const { data, isLoading, error } = useApiQuery(() => getAuditLog({ page: 1, pageSize: 8 }));

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Recent admin activity</h2>
          <p className="text-xs text-ink-muted">The latest recorded actions across the portal.</p>
        </div>
        <Link to="/audit-log" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
          View log <ArrowRight size={13} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner size={22} />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" description="Admin actions will show up here as they happen." />
      ) : (
        <div className="space-y-1">
          {data.items.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 border-b border-black/5 py-2.5 last:border-0">
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <ScrollText size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{entry.action}</p>
                <p className="truncate text-xs text-ink-muted">{entry.targetType} &middot; {entry.targetId}</p>
              </div>
              <span className="flex-shrink-0 text-xs text-ink-muted" title={formatDateTime(entry.timestamp)}>
                {formatRelativeAge(entry.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function QuickActions() {
  const items = useVisibleNavItems().filter((item) => item.to !== "/dashboard");

  if (items.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-ink">Quick actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-start gap-2.5 rounded-xl border border-black/5 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon size={16} />
            </span>
            <span className="text-sm font-medium text-ink">{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RestrictedCard({ reason }: { reason: string }) {
  return (
    <Card className="flex items-center gap-4 bg-black/[0.015]">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-black/5 text-ink-muted">
        <Lock size={20} />
      </span>
      <div>
        <p className="text-sm font-medium text-ink">Platform metrics are restricted</p>
        <p className="text-xs text-ink-muted">{reason}</p>
      </div>
    </Card>
  );
}
