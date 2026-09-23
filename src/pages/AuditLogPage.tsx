import { useState } from "react";
import { ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import { getAuditLog } from "../services/admin";
import { useApiQuery } from "../lib/useApiQuery";
import { formatDateTime } from "../lib/format";
import { Card } from "../components/Card";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";

const PAGE_SIZE = 20;

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ actorId: "", action: "" });

  const { data, isLoading, error } = useApiQuery(
    () => getAuditLog({ page, pageSize: PAGE_SIZE, actorId: appliedFilters.actorId, action: appliedFilters.action }),
    [page, appliedFilters],
  );

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ actorId: actorId.trim(), action: action.trim() });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Administrative action history</h2>
        <p className="text-xs text-ink-muted">Every recorded admin action - report decisions, plan edits, data erasures, and more.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Actor ID</label>
          <input
            value={actorId}
            onChange={(event) => setActorId(event.target.value)}
            placeholder="user guid"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Action</label>
          <input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="e.g. Report.Approve"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Search size={15} /> Filter
        </button>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No matching entries" description="Try widening your filters." />
      ) : (
        <>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Actor</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id} className="border-b border-black/5 last:border-0 align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDateTime(entry.timestamp)}</td>
                    <td className="px-5 py-3 font-medium text-ink">{entry.action}</td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                      {entry.targetType} &middot; {entry.targetId}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-muted">{entry.actorId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between text-sm text-ink-muted">
            <span>
              Page {data.page} of {totalPages} &middot; {data.totalCount} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
