import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  EyeOff,
  Flag,
  FolderInput,
  RotateCcw,
  UserRound,
  XCircle,
} from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { formatDateTime, formatKobo, formatRelativeAge } from "../lib/format";
import { approveListing, rejectListing, resolveReport } from "../services/admin";
import { changeListingCategory, getAdminListing, reinstateListing, takeDownListing } from "../services/adminListings";
import { getCategories } from "../services/categories";
import type { ReportDecision } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { LISTING_STATUS, formatNaira } from "./AdsPage";

const TAKEDOWN_REASONS = [
  "Counterfeit or fake item",
  "Prohibited or restricted item",
  "Misleading price or description",
  "Scam reports from buyers",
  "Duplicate ad",
];

const REJECT_REASONS = [
  "Photos don't match the item or are low quality",
  "Prohibited or restricted item",
  "Wrong category",
  "Misleading title, price or description",
];

const textareaClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function ReasonModal({
  open,
  title,
  description,
  presets,
  confirmLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  presets: string[];
  confirmLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className={`rounded-full border px-3 py-1 text-xs ${
                reason === preset ? "border-brand-500 bg-brand-50 text-brand-700" : "border-black/10 text-ink-muted hover:bg-black/5"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Reason shown to the seller"
          className={textareaClassName}
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim() || busy}
            onClick={() => onConfirm(reason.trim())}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {busy && <Spinner size={14} />} {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/5 bg-black/[0.015] px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value.toLocaleString("en-NG")}</p>
    </div>
  );
}

const HISTORY_LABEL: Record<string, string> = {
  "Listing.Approved": "Approved",
  "Listing.Rejected": "Rejected",
  "Listing.TakenDown": "Taken down",
  "Listing.Reinstated": "Reinstated",
  "Listing.CategoryChanged": "Category changed",
};

export function AdDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { user: me, isSuperAdmin, hasPermission } = useAuth();
  const { data: ad, isLoading, error, refetch } = useApiQuery(() => getAdminListing(id), [id]);
  const { data: categories } = useApiQuery(() => getCategories());

  const [photoIndex, setPhotoIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<"takedown" | "reject" | "category" | null>(null);
  const [newCategoryId, setNewCategoryId] = useState("");

  const canManage = hasPermission("listings.manage");
  // Approve/reject and report decisions are moderator actions on the API.
  const canModerate = isSuperAdmin || me?.role === "Moderator";
  const canViewUsers = hasPermission("users.view");

  const categoryOptions = useMemo(() => {
    const all = categories ?? [];
    return all
      .filter((c) => c.parentCategoryId === null)
      .flatMap((parent) => [
        { value: parent.id, label: parent.name },
        ...all.filter((c) => c.parentCategoryId === parent.id).map((child) => ({ value: child.id, label: `${parent.name} › ${child.name}` })),
      ]);
  }, [categories]);

  async function run(key: string, action: () => Promise<unknown>, success: string, failure: string) {
    setBusy(key);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      setModal(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !ad) {
    return <ErrorBanner message={error ?? "This ad could not be found."} />;
  }

  const status = LISTING_STATUS[ad.status];
  const isLive = ad.status === "Active" || ad.status === "ExpiringSoon";
  const openReports = ad.reports.filter((r) => r.status === "Open");
  const photo = ad.mediaUrls[photoIndex];

  return (
    <div className="space-y-4">
      <Link to="/ads" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> All ads
      </Link>

      {actionError && <ErrorBanner message={actionError} />}
      {notice && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={15} /> {notice}
        </p>
      )}

      <Card className="flex flex-col gap-6 lg:flex-row">
        {/* Photos */}
        <div className="lg:w-80 lg:shrink-0">
          {photo ? (
            <img src={photo} alt="" className="aspect-[4/3] w-full rounded-xl bg-black/5 object-cover" />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-black/5 text-xs text-ink-muted">No photos</div>
          )}
          {ad.mediaUrls.length > 1 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto">
              {ad.mediaUrls.map((url, index) => (
                <button
                  key={`${index}-${url}`}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${index === photoIndex ? "border-brand-500" : "border-transparent"}`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">{ad.title}</h2>
            <Badge tone={status.tone}>{status.label}</Badge>
            {ad.planName && <Badge tone="brand">{ad.planName} plan</Badge>}
            {openReports.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                <Flag size={12} /> {openReports.length} open report{openReports.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-xl font-semibold text-brand-700">{formatNaira(ad.price)}</p>
          {ad.reviewNote && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Note to seller: {ad.reviewNote}
            </p>
          )}
          <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
            <dt className="text-ink-muted">Category</dt>
            <dd className="text-ink">{ad.parentCategoryName ? `${ad.parentCategoryName} › ${ad.categoryName}` : (ad.categoryName ?? "—")}</dd>
            <dt className="text-ink-muted">Condition</dt>
            <dd className="text-ink">{ad.condition}</dd>
            <dt className="text-ink-muted">Location</dt>
            <dd className="text-ink">{ad.location ?? "—"}</dd>
            <dt className="text-ink-muted">Posted</dt>
            <dd className="text-ink">{formatDateTime(ad.createdAt)}</dd>
            <dt className="text-ink-muted">Live since</dt>
            <dd className="text-ink">{ad.publishedAt ? formatDateTime(ad.publishedAt) : "—"}</dd>
            <dt className="text-ink-muted">Expires</dt>
            <dd className="text-ink">{ad.expiresAt ? formatDateTime(ad.expiresAt) : "—"}</dd>
          </dl>
          <p className="whitespace-pre-line text-sm text-ink">{ad.description}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 lg:w-56 lg:flex-col">
          {ad.status === "PendingReview" && canModerate && (
            <>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run("approve", () => approveListing(ad.id), "Ad approved - it's now live.", "Could not approve.")}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {busy === "approve" ? <Spinner size={14} /> : <CheckCircle2 size={15} />} Approve
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setModal("reject")}
                className="flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                <XCircle size={15} /> Reject
              </button>
            </>
          )}
          {isLive && canManage && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setModal("takedown")}
              className="flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
            >
              <EyeOff size={15} /> Take down
            </button>
          )}
          {ad.status === "Paused" && canManage && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("reinstate", () => reinstateListing(ad.id), "Ad reinstated.", "Could not reinstate.")}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {busy === "reinstate" ? <Spinner size={14} /> : <RotateCcw size={15} />} Reinstate
            </button>
          )}
          {canManage && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setNewCategoryId(ad.categoryId);
                setModal("category");
              }}
              className="flex items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5 disabled:opacity-60"
            >
              <FolderInput size={15} /> Change category
            </button>
          )}
          {canViewUsers && (
            <Link
              to={`/users/${ad.seller.userId}`}
              className="flex items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5"
            >
              <UserRound size={15} /> View seller
            </Link>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Seller */}
        <Card className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Seller</h3>
          <p className="flex items-center gap-1 text-sm font-medium text-ink">
            {ad.seller.businessName}
            {ad.seller.verificationStatus === "Verified" && <BadgeCheck size={14} className="text-brand-600" />}
          </p>
          <p className="text-xs text-ink-muted">
            {ad.seller.name ?? "—"} · {ad.seller.phone ?? "no phone"}
          </p>
          <p className="text-xs text-ink-muted">Verification: {ad.seller.verificationStatus}</p>
          {ad.seller.isSuspended && <Badge tone="danger">Seller suspended</Badge>}
        </Card>

        {/* Performance */}
        <Card className="space-y-3 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink">Performance on Ogasela (all time)</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Impressions" value={ad.stats.impressions} />
            <Stat label="Views" value={ad.stats.views} />
            <Stat label="Calls" value={ad.stats.callClicks} />
            <Stat label="Chats" value={ad.stats.messageStarts} />
            <Stat label="Saves" value={ad.stats.saves} />
          </div>
          {ad.campaigns.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="py-1">Campaign</th>
                  <th className="py-1">Status</th>
                  <th className="py-1 text-right">Impressions</th>
                  <th className="py-1 text-right">Clicks</th>
                  <th className="py-1 text-right">Spend</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {ad.campaigns.map((c) => (
                  <tr key={c.platform} className="border-t border-black/5">
                    <td className="py-1.5 font-medium text-ink">{c.platform}</td>
                    <td className="py-1.5 text-ink-muted">{c.status}</td>
                    <td className="py-1.5 text-right">{c.impressions.toLocaleString("en-NG")}</td>
                    <td className="py-1.5 text-right">{c.clicks.toLocaleString("en-NG")}</td>
                    <td className="py-1.5 text-right">{formatKobo(c.spendKobo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Reports */}
        <Card className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Flag size={15} /> Reports
          </h3>
          {ad.reports.length === 0 ? (
            <p className="text-sm text-ink-muted">No one has reported this ad.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {ad.reports.map((report) => (
                <li key={report.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={report.status === "Open" ? "warning" : "neutral"}>{report.status}</Badge>
                    {report.systemGenerated && (
                      <span className="text-xs text-ink-muted">
                        Fraud check{report.fraudScore !== null ? ` · ${Math.round(report.fraudScore * 100)}% risk` : ""}
                      </span>
                    )}
                    <span className="text-xs text-ink-muted">{formatRelativeAge(report.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-ink">{report.reason}</p>
                  {report.status === "Open" && canModerate && (
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["Approve", "Dismiss"],
                          ["Remove", "Uphold & pause ad"],
                          ["Escalate", "Escalate"],
                        ] as [ReportDecision, string][]
                      ).map(([decision, label]) => (
                        <button
                          key={decision}
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            run(`report-${report.id}`, () => resolveReport(report.id, decision, `${label} via All Ads`), "Report updated.", "Could not update the report.")
                          }
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                            decision === "Remove" ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-black/10 text-ink hover:bg-black/5"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* History */}
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Admin history</h3>
          {ad.history.length === 0 ? (
            <p className="text-sm text-ink-muted">No admin actions yet.</p>
          ) : (
            <ul className="space-y-2">
              {ad.history.map((entry, index) => (
                <li key={index} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-ink">{HISTORY_LABEL[entry.action] ?? entry.action}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{formatDateTime(entry.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ReasonModal
        open={modal === "takedown"}
        title="Take down this ad"
        description="It's hidden from buyers right away and the seller is told why. You can reinstate it later."
        presets={TAKEDOWN_REASONS}
        confirmLabel="Take down"
        busy={busy === "takedown"}
        onClose={() => setModal(null)}
        onConfirm={(reason) => run("takedown", () => takeDownListing(ad.id, reason), "Ad taken down - the seller has been notified.", "Could not take it down.")}
      />
      <ReasonModal
        open={modal === "reject"}
        title="Reject this ad"
        description="It goes back to the seller as a draft with your reason; a paid plan is refunded."
        presets={REJECT_REASONS}
        confirmLabel="Reject ad"
        busy={busy === "reject"}
        onClose={() => setModal(null)}
        onConfirm={(reason) => run("reject", () => rejectListing(ad.id, reason), "Ad rejected - the seller has been notified.", "Could not reject.")}
      />
      <Modal open={modal === "category"} onClose={() => setModal(null)} title="Change category" description="Moves the ad so buyers find it in the right place.">
        <div className="space-y-4">
          <Select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} placeholder="Choose a category" options={categoryOptions} />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newCategoryId || newCategoryId === ad.categoryId || busy !== null}
              onClick={() => run("category", () => changeListingCategory(ad.id, newCategoryId), "Category changed.", "Could not change the category.")}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {busy === "category" && <Spinner size={14} />} Move ad
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
