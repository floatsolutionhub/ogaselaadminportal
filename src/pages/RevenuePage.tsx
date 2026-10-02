import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  RotateCcw,
  Search,
  Store,
  TrendingUp,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { formatDateTime, formatKobo, formatNumber } from "../lib/format";
import { getRevenueSummary, getRevenueTransactions, refundTransaction } from "../services/revenue";
import type { RevenueTransaction, TransactionStatus, TransactionType } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Pagination } from "../components/Pagination";
import { Modal } from "../components/Modal";

const PAGE_SIZE = 25;

// Validated pair (scripts/validate_palette.js): passes CVD separation and contrast on the light surface.
const REVENUE_COLOR = "#108f60";
const TOPUP_COLOR = "#5b5bd6";

const PRESETS = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "12m", label: "12 months", days: 365 },
] as const;

const TYPE_LABEL: Record<TransactionType, string> = {
  PlanPurchase: "Plan purchase",
  AdSpendTopUp: "Wallet top-up",
  Refund: "Refund",
};

const STATUS_STYLE: Record<TransactionStatus, { label: string; tone: "neutral" | "brand" | "warning" | "danger" | "success" }> = {
  Pending: { label: "Pending", tone: "warning" },
  Success: { label: "Successful", tone: "success" },
  Failed: { label: "Failed", tone: "danger" },
  Refunded: { label: "Refunded", tone: "neutral" },
};

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return isoDate(date);
}

/** Compact Naira for axis ticks: ₦1.2m, ₦45k. */
function compactNaira(kobo: number): string {
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(naira >= 10_000_000 ? 0 : 1)}m`;
  if (naira >= 1_000) return `₦${Math.round(naira / 1_000)}k`;
  return `₦${Math.round(naira)}`;
}

function Tile({
  label,
  value,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
        {children}
        {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={20} strokeWidth={2} />
      </span>
    </Card>
  );
}

function Change({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <p className="mt-1 text-xs text-ink-muted">{current > 0 ? "No revenue in the previous period" : "Same as the previous period"}</p>;
  }
  const change = (current - previous) / previous;
  const up = change >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-700" : "text-rose-700"}`}>
      <Arrow size={13} /> {Math.abs(change * 100).toFixed(1)}% <span className="font-normal text-ink-muted">&nbsp;vs previous period</span>
    </p>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  bucket,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
  bucket: "day" | "month";
}) {
  if (!active || !payload?.length || !label) return null;
  const date = new Date(label);
  const value = (key: string) => payload.find((p) => p.dataKey === key)?.value ?? 0;
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-ink">
        {bucket === "month"
          ? date.toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" })
          : date.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
      </p>
      <p className="flex items-center gap-2 text-ink-muted">
        <span className="inline-block h-0.5 w-3 rounded" style={{ background: REVENUE_COLOR }} /> Revenue earned
        <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{formatKobo(value("revenueKobo"))}</span>
      </p>
      <p className="flex items-center gap-2 text-ink-muted">
        <span className="inline-block h-0.5 w-3 rounded border-t-2 border-dashed" style={{ borderColor: TOPUP_COLOR }} /> Wallet top-ups
        <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{formatKobo(value("topUpsKobo"))}</span>
      </p>
    </div>
  );
}

export function RevenuePage() {
  const [preset, setPreset] = useState<string>("30d");
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(isoDate(new Date()));

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [status, setStatus] = useState<TransactionStatus | "">("");
  const [page, setPage] = useState(1);

  const [refunding, setRefunding] = useState<RevenueTransaction | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const summary = useApiQuery(() => getRevenueSummary(from, to), [from, to]);
  const ledger = useApiQuery(
    () =>
      getRevenueTransactions({
        type: type || undefined,
        status: status || undefined,
        search: search || undefined,
        from,
        to,
        page,
        pageSize: PAGE_SIZE,
      }),
    [type, status, search, from, to, page],
  );

  const data = summary.data;
  const planTotal = useMemo(() => (data ? data.byPlan.reduce((sum, p) => sum + p.revenueKobo, 0) : 0), [data]);
  const totalPages = ledger.data ? Math.max(1, Math.ceil(ledger.data.totalCount / PAGE_SIZE)) : 1;
  const filtered = !!(search || type || status);

  const choosePreset = (key: string, days: number) => {
    setPreset(key);
    setFrom(daysAgo(days));
    setTo(isoDate(new Date()));
    setPage(1);
  };

  const confirmRefund = async () => {
    if (!refunding) return;
    setRefundBusy(true);
    setRefundError(null);
    try {
      await refundTransaction(refunding.id);
      setNotice(`Refunded ${formatKobo(refunding.amountKobo)} to ${refunding.businessName}.`);
      setRefunding(null);
      ledger.refetch();
      summary.refetch();
    } catch (err) {
      setRefundError(err instanceof ApiError ? err.message : "Couldn't refund this transaction.");
    } finally {
      setRefundBusy(false);
    }
  };

  const tickFormatter = (iso: string) => {
    const date = new Date(iso);
    return data?.bucket === "month"
      ? date.toLocaleDateString("en-NG", { month: "short", timeZone: "UTC" })
      : date.toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Revenue</h2>
          <p className="text-xs text-ink-muted">
            What Ogasela earns from promotion plans, the money sellers put into their wallets, and refunds.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex rounded-lg border border-black/10 bg-white p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => choosePreset(p.key, p.days)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  preset === p.key ? "bg-brand-500 text-white" : "text-ink-muted hover:bg-black/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              if (!e.target.value) return;
              setFrom(e.target.value);
              setPreset("custom");
              setPage(1);
            }}
            aria-label="From"
            className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
          />
          <span className="pb-1.5 text-xs text-ink-muted">to</span>
          <input
            type="date"
            value={to}
            min={from}
            max={isoDate(new Date())}
            onChange={(e) => {
              if (!e.target.value) return;
              setTo(e.target.value);
              setPreset("custom");
              setPage(1);
            }}
            aria-label="To"
            className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {summary.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : summary.error || !data ? (
        <ErrorBanner message={summary.error ?? "Couldn't load revenue."} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Tile label="Revenue earned" value={formatKobo(data.revenueKobo)} icon={TrendingUp}>
              <Change current={data.revenueKobo} previous={data.previousRevenueKobo} />
            </Tile>
            <Tile
              label="Wallet top-ups collected"
              value={formatKobo(data.topUpsKobo)}
              hint={`${formatNumber(data.topUps)} paid · ${formatNumber(data.pendingTopUps)} pending · ${formatNumber(data.failedTopUps)} failed`}
              icon={Banknote}
            />
            <Tile
              label="Plan purchases"
              value={formatNumber(data.planPurchases)}
              hint={`${formatNumber(data.payingSellers)} paying seller${data.payingSellers === 1 ? "" : "s"}`}
              icon={Store}
            />
            <Tile label="Refunds issued" value={formatKobo(data.refundsKobo)} hint={`${formatNumber(data.refunds)} refund${data.refunds === 1 ? "" : "s"}`} icon={Undo2} />
            <Tile
              label="Held in seller wallets"
              value={formatKobo(data.walletBalancesKobo)}
              hint="Paid in but not yet spent - right now, all sellers"
              icon={Wallet}
            />
            <Tile label="All-time revenue" value={formatKobo(data.allTimeRevenueKobo)} hint="Every successful plan purchase to date" icon={TrendingUp} />
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-ink">Revenue over time</h3>
            <p className="mb-4 text-xs text-ink-muted">
              Per {data.bucket}. Revenue is earned when a seller pays for a plan; top-ups are money added to wallets.
            </p>
            {data.revenueKobo === 0 && data.topUpsKobo === 0 ? (
              <p className="py-12 text-center text-sm text-ink-muted">No payments in this period.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e9e6" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={tickFormatter}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={compactNaira}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip
                      cursor={{ stroke: "#9ca3af", strokeWidth: 1 }}
                      content={(props) => <ChartTooltip {...(props as object)} bucket={data.bucket} />}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={28}
                      iconType="plainline"
                      formatter={(value) => <span className="text-xs text-ink-muted">{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenueKobo"
                      name="Revenue earned"
                      stroke={REVENUE_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="topUpsKobo"
                      name="Wallet top-ups"
                      stroke={TOPUP_COLOR}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="text-sm font-semibold text-ink">Revenue by plan</h3>
              <p className="mb-4 text-xs text-ink-muted">Share of revenue earned in this period.</p>
              {data.byPlan.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">No plan purchases in this period.</p>
              ) : (
                <ul className="space-y-3">
                  {data.byPlan.map((plan) => {
                    const share = planTotal === 0 ? 0 : plan.revenueKobo / planTotal;
                    return (
                      <li key={plan.planName}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-medium text-ink">{plan.planName}</span>
                          <span className="tabular-nums text-ink">
                            {formatKobo(plan.revenueKobo)}{" "}
                            <span className="text-xs text-ink-muted">
                              · {formatNumber(plan.count)} · {(share * 100).toFixed(0)}%
                            </span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/5">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, 1)}%`, background: REVENUE_COLOR }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-ink">Top paying sellers</h3>
              <p className="mb-4 text-xs text-ink-muted">By plan spend in this period.</p>
              {data.topSellers.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">No plan purchases in this period.</p>
              ) : (
                <ol className="divide-y divide-black/5">
                  {data.topSellers.map((seller, index) => (
                    <li key={seller.userId} className="flex items-center gap-3 py-2.5">
                      <span className="w-5 text-xs font-semibold tabular-nums text-ink-muted">{index + 1}</span>
                      <Link to={`/users/${seller.userId}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-brand-600">
                        {seller.businessName}
                      </Link>
                      <span className="text-xs text-ink-muted">{formatNumber(seller.count)} plan{seller.count === 1 ? "" : "s"}</span>
                      <span className="w-28 text-right text-sm font-semibold tabular-nums text-ink">{formatKobo(seller.revenueKobo)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}

      <div className="pt-2">
        <h3 className="text-sm font-semibold text-ink">Transactions</h3>
        <p className="text-xs text-ink-muted">Every wallet payment in the selected period, newest first.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Business name or payment reference"
              className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Type</label>
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as TransactionType | "");
              setPage(1);
            }}
            placeholder="Any type"
            options={(Object.keys(TYPE_LABEL) as TransactionType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TransactionStatus | "");
              setPage(1);
            }}
            placeholder="Any status"
            options={(Object.keys(STATUS_STYLE) as TransactionStatus[]).map((s) => ({ value: s, label: STATUS_STYLE[s].label }))}
          />
        </div>
      </Card>

      {ledger.isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : ledger.error ? (
        <ErrorBanner message={ledger.error} />
      ) : !ledger.data || ledger.data.items.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title={filtered ? "No transactions match" : "No transactions in this period"}
          description={filtered ? "Try a different search or filter." : "Payments appear here as sellers top up and buy plans."}
        />
      ) : (
        <>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Seller</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">For</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {ledger.data.items.map((t) => {
                  const statusStyle = STATUS_STYLE[t.status];
                  const refundable = t.status === "Success" && t.type !== "Refund";
                  return (
                    <tr key={t.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]">
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDateTime(t.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Link to={`/users/${t.sellerUserId}`} className="font-medium text-ink hover:text-brand-600">
                          {t.businessName}
                        </Link>
                        {t.gatewayReference && <p className="font-mono text-[11px] text-ink-muted">{t.gatewayReference}</p>}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{TYPE_LABEL[t.type]}</td>
                      <td className="max-w-[220px] px-5 py-3 text-ink-muted">
                        {t.listingId ? (
                          <Link to={`/ads/${t.listingId}`} className="block truncate hover:text-brand-600">
                            {t.planName ? `${t.planName} · ` : ""}
                            {t.listingTitle ?? "Ad"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums ${
                          t.type === "Refund" ? "text-rose-700" : "text-ink"
                        }`}
                      >
                        {t.type === "Refund" ? "−" : ""}
                        {formatKobo(t.amountKobo)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={statusStyle.tone}>{statusStyle.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {refundable && (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundError(null);
                              setNotice(null);
                              setRefunding(t);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-black/5"
                          >
                            <RotateCcw size={12} /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Pagination page={page} totalPages={totalPages} totalCount={ledger.data.totalCount} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={!!refunding}
        onClose={() => setRefunding(null)}
        title={refunding ? `Refund ${formatKobo(refunding.amountKobo)}?` : ""}
        description={
          refunding?.type === "AdSpendTopUp"
            ? `The top-up is refunded to ${refunding.businessName}'s card or bank through the payment gateway, and taken out of their wallet. Their wallet must still hold the amount.`
            : `The amount goes back into ${refunding?.businessName ?? "the seller"}'s Ogasela wallet. Their ad stays as it is.`
        }
      >
        <div className="space-y-4">
          {refundError && <ErrorBanner message={refundError} />}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRefunding(null)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={refundBusy}
              onClick={confirmRefund}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {refundBusy && <Spinner size={14} />} Refund
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
