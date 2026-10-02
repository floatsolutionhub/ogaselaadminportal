import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Newspaper, Search } from "lucide-react";
import { getAdminListings } from "../services/adminListings";
import { getCategories } from "../services/categories";
import { getPromotionPlans } from "../services/settings";
import { useApiQuery } from "../lib/useApiQuery";
import { formatDateTime } from "../lib/format";
import type { ListingStatus, PlanName } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 25;

export const LISTING_STATUS: Record<ListingStatus, { label: string; tone: "neutral" | "brand" | "warning" | "danger" | "success" }> = {
  Draft: { label: "Draft", tone: "neutral" },
  PendingReview: { label: "Awaiting approval", tone: "warning" },
  Active: { label: "Live", tone: "success" },
  ExpiringSoon: { label: "Expiring soon", tone: "warning" },
  Expired: { label: "Expired", tone: "neutral" },
  Paused: { label: "Paused", tone: "danger" },
  Sold: { label: "Sold", tone: "brand" },
};

export function formatNaira(amount: number | null): string {
  return amount === null ? "Price on request" : `₦${amount.toLocaleString("en-NG")}`;
}

export function AdsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListingStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [plan, setPlan] = useState<PlanName | "">("");
  const [reported, setReported] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categories } = useApiQuery(() => getCategories());
  const { data: plans } = useApiQuery(() => getPromotionPlans());
  const categoryOptions = useMemo(() => {
    const all = categories ?? [];
    return all
      .filter((c) => c.parentCategoryId === null)
      .flatMap((parent) => [
        { value: parent.id, label: parent.name },
        ...all.filter((c) => c.parentCategoryId === parent.id).map((child) => ({ value: child.id, label: `  ${parent.name} › ${child.name}` })),
      ]);
  }, [categories]);

  const { data, isLoading, error } = useApiQuery(
    () =>
      getAdminListings({
        search: search || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        plan: plan || undefined,
        reported,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, status, categoryId, plan, reported, page],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const filtered = !!(search || status || categoryId || plan || reported);
  const resetPage = () => setPage(1);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">All ads</h2>
        <p className="text-xs text-ink-muted">Every ad on Ogasela in any status, newest first.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ad title or seller name"
              className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ListingStatus | "");
              resetPage();
            }}
            placeholder="Any status"
            options={[
              { value: "PendingReview", label: "Awaiting approval" },
              { value: "Active", label: "Live" },
              { value: "Paused", label: "Paused" },
              { value: "Expired", label: "Expired" },
              { value: "Sold", label: "Sold" },
              { value: "Draft", label: "Draft" },
            ]}
          />
        </div>
        <div className="w-56">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Category</label>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              resetPage();
            }}
            placeholder="Any category"
            options={categoryOptions}
          />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Plan</label>
          <Select
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value as PlanName | "");
              resetPage();
            }}
            placeholder="Any plan"
            options={(plans ?? []).map((p) => ({ value: p.name, label: p.name }))}
          />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={reported}
            onChange={(e) => {
              setReported(e.target.checked);
              resetPage();
            }}
            className="h-4 w-4 accent-brand-500"
          />
          Reported only
        </label>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={filtered ? "No ads match" : "No ads yet"}
          description={filtered ? "Try a different search or filter." : "Ads appear here as sellers post them."}
        />
      ) : (
        <>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Ad</th>
                  <th className="px-5 py-3">Seller</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Posted</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((ad) => {
                  const statusStyle = LISTING_STATUS[ad.status];
                  return (
                    <tr key={ad.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]">
                      <td className="px-5 py-3">
                        <Link to={`/ads/${ad.id}`} className="flex items-center gap-3">
                          {ad.thumbnailUrl ? (
                            <img src={ad.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="h-10 w-10 shrink-0 rounded-lg bg-black/5" />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink hover:text-brand-600">{ad.title}</span>
                            <span className="block text-xs text-ink-muted">{formatNaira(ad.price)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">
                        <Link to={`/users/${ad.sellerUserId}`} className="hover:text-brand-600">
                          {ad.sellerBusinessName}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{ad.categoryName ?? "—"}</td>
                      <td className="px-5 py-3 text-ink-muted">{ad.planName ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={statusStyle.tone}>{statusStyle.label}</Badge>
                          {ad.openReports > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-rose-600">
                              <Flag size={12} /> {ad.openReports}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{formatDateTime(ad.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Pagination page={page} totalPages={totalPages} totalCount={data.totalCount} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
