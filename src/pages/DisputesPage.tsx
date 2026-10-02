import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessagesSquare, Scale, Search } from "lucide-react";
import { getDisputes } from "../services/disputes";
import { useApiQuery } from "../lib/useApiQuery";
import { formatDateTime } from "../lib/format";
import type { DisputeOutcome, DisputeReason, DisputeStatus } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 25;

export const DISPUTE_STATUS: Record<DisputeStatus, { label: string; tone: "neutral" | "brand" | "warning" | "danger" | "success" }> = {
  Open: { label: "Open", tone: "danger" },
  InReview: { label: "In review", tone: "warning" },
  Resolved: { label: "Resolved", tone: "success" },
};

export const DISPUTE_REASON: Record<DisputeReason, string> = {
  ItemNotAsDescribed: "Item not as described",
  NotDelivered: "Item not delivered",
  PaidNoResponse: "Paid, seller stopped responding",
  FakeOrCounterfeit: "Fake or counterfeit item",
  BuyerDidNotPay: "Buyer didn't pay",
  Other: "Other",
};

export const DISPUTE_OUTCOME: Record<DisputeOutcome, string> = {
  InFavourOfRaiser: "Resolved in favour of the person who raised it",
  InFavourOfRespondent: "Resolved in favour of the other party",
  MutualAgreement: "Settled by mutual agreement",
  Dismissed: "Dismissed",
};

export function DisputesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DisputeStatus | "">("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useApiQuery(
    () => getDisputes({ search: search || undefined, status: status || undefined, assignedToMe, page, pageSize: PAGE_SIZE }),
    [search, status, assignedToMe, page],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const filtered = !!(search || status || assignedToMe);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Disputes &amp; Resolutions</h2>
        <p className="text-xs text-ink-muted">Disputes buyers and sellers raise about a deal in the app, newest first.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Reference, ad title or either party's name"
              className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as DisputeStatus | "");
              setPage(1);
            }}
            placeholder="Any status"
            options={(Object.keys(DISPUTE_STATUS) as DisputeStatus[]).map((s) => ({ value: s, label: DISPUTE_STATUS[s].label }))}
          />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={assignedToMe}
            onChange={(e) => {
              setAssignedToMe(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 accent-brand-500"
          />
          My cases only
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
          icon={Scale}
          title={filtered ? "No disputes match" : "No disputes yet"}
          description={filtered ? "Try a different search or filter." : "Disputes raised in the app will appear here."}
        />
      ) : (
        <>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Dispute</th>
                  <th className="px-5 py-3">Raised by</th>
                  <th className="px-5 py-3">Against</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Handled by</th>
                  <th className="px-5 py-3">Opened</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((dispute) => {
                  const statusStyle = DISPUTE_STATUS[dispute.status];
                  return (
                    <tr key={dispute.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]">
                      <td className="px-5 py-3">
                        <Link to={`/disputes/${dispute.id}`} className="block">
                          <span className="block font-medium text-ink hover:text-brand-600">{dispute.reference}</span>
                          <span className="block max-w-[240px] truncate text-xs text-ink-muted">{dispute.listingTitle}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{dispute.raisedByName}</td>
                      <td className="px-5 py-3 text-ink-muted">{dispute.againstName}</td>
                      <td className="px-5 py-3 text-ink-muted">{DISPUTE_REASON[dispute.reason]}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={statusStyle.tone}>{statusStyle.label}</Badge>
                          {dispute.messageCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted">
                              <MessagesSquare size={12} /> {dispute.messageCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{dispute.assignedToName ?? "Unassigned"}</td>
                      <td className="px-5 py-3 text-ink-muted">{formatDateTime(dispute.createdAt)}</td>
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
