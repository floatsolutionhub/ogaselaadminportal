import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail, Phone, Store, UserCog, XCircle } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { formatRelativeAge } from "../lib/format";
import { getChangeRequests, reviewChangeRequest } from "../services/changeRequests";
import type { AdminProfileChange, ProfileChangeStatus, ProfileChangeType } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Pagination } from "../components/Pagination";
import { Modal } from "../components/Modal";

const PAGE_SIZE = 25;

const TYPE_META: Record<ProfileChangeType, { label: string; icon: typeof Phone }> = {
  Phone: { label: "Phone number", icon: Phone },
  Email: { label: "Email", icon: Mail },
  BusinessInfo: { label: "Business info", icon: Store },
};

const STATUS_BADGE: Record<ProfileChangeStatus, { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  PendingReview: { label: "Awaiting review", tone: "warning" },
  Approved: { label: "Approved", tone: "success" },
  Rejected: { label: "Rejected", tone: "danger" },
  Cancelled: { label: "Withdrawn", tone: "neutral" },
};

const REJECT_PRESETS = [
  "We couldn't confirm this change is genuine.",
  "The business name doesn't match your registration document.",
  "Please upload a proof of address that matches the new address.",
];

const textareaClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/** App users' phone, email and business-info changes - none take effect until approved here. */
export function ChangeRequestsPage() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission("users.changes.review");
  const [status, setStatus] = useState<ProfileChangeStatus | "">("PendingReview");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminProfileChange | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, error, refetch } = useApiQuery(
    () => getChangeRequests({ status: status || undefined, page, pageSize: PAGE_SIZE }),
    [status, page],
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  async function review(change: AdminProfileChange, approve: boolean, reason?: string) {
    setBusyId(change.id);
    setActionError(null);
    setNotice(null);
    try {
      await reviewChangeRequest(change.id, approve, reason);
      setNotice(approve ? "Change approved and applied - the user has been notified." : "Change rejected - the user has been notified.");
      refetch();
      return true;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not apply that decision.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Change requests</h2>
          <p className="text-xs text-ink-muted">
            Phone, email and business info changes from app users. Nothing changes on the account until it's approved.
          </p>
        </div>
        <div className="w-48">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ProfileChangeStatus | "");
              setPage(1);
            }}
            options={[
              { value: "PendingReview", label: "Awaiting review" },
              { value: "Approved", label: "Approved" },
              { value: "Rejected", label: "Rejected" },
              { value: "Cancelled", label: "Withdrawn" },
              { value: "", label: "All" },
            ]}
          />
        </div>
      </div>

      {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{notice}</p>}
      {actionError && <ErrorBanner message={actionError} />}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={UserCog} title="No change requests" description="Nothing matches this filter right now." />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((change) => {
              const meta = TYPE_META[change.type];
              const badge = STATUS_BADGE[change.status];
              return (
                <Card key={change.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">
                        <meta.icon size={12} className="mr-1 inline" /> {meta.label}
                      </Badge>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      <span className="text-xs text-ink-muted">{formatRelativeAge(change.createdAt)}</span>
                    </div>
                    <Link to={`/users/${change.userId}`} className="text-sm font-medium text-brand-700 hover:underline">
                      {change.userName || "Unnamed user"} · {change.userRole}
                    </Link>
                  </div>

                  <Comparison change={change} />

                  {change.status === "Rejected" && change.reviewNote && (
                    <p className="text-xs text-rose-700">Reason: {change.reviewNote}</p>
                  )}

                  {change.status === "PendingReview" && canReview && (
                    <div className="flex justify-end gap-2">
                      {busyId === change.id ? (
                        <Spinner size={20} />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectReason("");
                              setRejecting(change);
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => review(change, true)}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} totalCount={data.totalCount} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject this change"
        description="The user keeps their current details, is notified with your reason, and can submit again."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {REJECT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRejectReason(preset)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  rejectReason === preset ? "border-brand-500 bg-brand-50 text-brand-700" : "border-black/10 text-ink-muted hover:bg-black/5"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Reason shown to the user"
            className={textareaClassName}
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRejecting(null)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectReason.trim() || busyId !== null || !rejecting}
              onClick={async () => {
                if (!rejecting) return;
                if (await review(rejecting, false, rejectReason.trim())) setRejecting(null);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              Reject change
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Current value on the left, requested value on the right. */
function Comparison({ change }: { change: AdminProfileChange }) {
  const rows =
    change.type === "BusinessInfo"
      ? [
          { label: "Business name", from: change.currentBusinessName, to: change.businessName },
          { label: "Store address", from: change.currentStoreAddress, to: change.storeAddress },
        ]
      : [
          {
            label: change.type === "Phone" ? "Phone" : "Email",
            from: change.type === "Phone" ? change.currentPhone : change.currentEmail,
            to: change.newValue,
          },
        ];

  return (
    <div className="space-y-1.5 rounded-lg bg-black/[0.02] px-3 py-2.5">
      {rows.map((row) => {
        const changed = (row.from ?? "") !== (row.to ?? "");
        return (
          <div key={row.label} className="grid grid-cols-[110px_1fr_16px_1fr] items-center gap-2 text-sm">
            <span className="text-xs text-ink-muted">{row.label}</span>
            <span className="truncate text-ink-muted">{row.from || "—"}</span>
            <ArrowRight size={14} className="text-ink-muted" />
            <span className={`truncate ${changed ? "font-semibold text-ink" : "text-ink-muted"}`}>{row.to || "—"}</span>
          </div>
        );
      })}
    </div>
  );
}
