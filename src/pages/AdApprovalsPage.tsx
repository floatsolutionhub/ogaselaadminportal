import { useState } from "react";
import { AlertTriangle, BadgeCheck, CheckCircle2, ImageOff, MapPin, XCircle } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { approveListing, getPendingListings, rejectListing } from "../services/admin";
import { useApiQuery } from "../lib/useApiQuery";
import { formatRelativeAge } from "../lib/format";
import type { PendingListing } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";

const REJECTION_REASONS = [
  "Photos don't match the item or are low quality",
  "Prohibited or restricted item",
  "Wrong category",
  "Misleading title, price or description",
  "Duplicate of another ad",
  "Contact details in the photos or description",
];

function formatNaira(amount: number | null): string {
  return amount === null ? "Price on request" : `₦${amount.toLocaleString("en-NG")}`;
}

function PendingListingCard({
  listing,
  isBusy,
  onApprove,
  onReject,
}: {
  listing: PendingListing;
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = listing.mediaUrls[photoIndex];
  const highRisk = listing.fraudScore !== null && listing.fraudScore >= 0.5;

  return (
    <Card className="flex flex-col gap-4 md:flex-row">
      <div className="md:w-56 md:shrink-0">
        {photo ? (
          <img src={photo} alt="" className="h-44 w-full rounded-xl object-cover" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center rounded-xl bg-black/5 text-ink-muted">
            <ImageOff size={22} />
          </div>
        )}
        {listing.mediaUrls.length > 1 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto">
            {listing.mediaUrls.map((url, index) => (
              <button
                key={`${index}-${url}`}
                type="button"
                onClick={() => setPhotoIndex(index)}
                className={`h-10 w-10 shrink-0 overflow-hidden rounded-md border-2 ${
                  index === photoIndex ? "border-brand-500" : "border-transparent"
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{listing.title}</p>
            <p className="text-sm font-semibold text-brand-700">{formatNaira(listing.price)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {listing.promotionPlanName && <Badge tone="brand">{listing.promotionPlanName} plan</Badge>}
            {listing.fraudScore !== null && (
              <Badge tone={highRisk ? "danger" : "warning"}>
                Fraud risk {Math.round(listing.fraudScore * 100)}%
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span>{listing.categoryName ?? "Uncategorised"}</span>
          <span>&middot; {listing.condition}</span>
          {listing.location && (
            <span className="flex items-center gap-1">
              &middot; <MapPin size={11} /> {listing.location}
            </span>
          )}
          <span>&middot; Submitted {formatRelativeAge(listing.submittedAt)}</span>
        </div>

        <p className="line-clamp-4 whitespace-pre-line text-sm text-ink">{listing.description}</p>

        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="font-medium text-ink">{listing.sellerBusinessName}</span>
          {listing.sellerVerificationStatus === "Verified" ? (
            <span className="flex items-center gap-0.5 text-brand-600">
              <BadgeCheck size={13} /> Verified seller
            </span>
          ) : (
            <span>&middot; {listing.sellerVerificationStatus}</span>
          )}
        </div>

        {highRisk && (
          <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle size={13} /> Flagged by the automatic fraud check - review carefully.
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onApprove}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {isBusy ? <Spinner size={14} /> : <CheckCircle2 size={15} />} Approve
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onReject}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            <XCircle size={15} /> Reject
          </button>
        </div>
      </div>
    </Card>
  );
}

export function AdApprovalsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getPendingListings());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [rejecting, setRejecting] = useState<PendingListing | null>(null);
  const [reason, setReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  async function approve(listing: PendingListing) {
    setBusyId(listing.id);
    setActionError(null);
    try {
      await approveListing(listing.id);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not approve this ad.");
    } finally {
      setBusyId(null);
    }
  }

  function openReject(listing: PendingListing) {
    setRejecting(listing);
    setReason("");
    setRejectError(null);
  }

  async function confirmReject() {
    if (!rejecting || !reason.trim()) return;
    setIsRejecting(true);
    setRejectError(null);
    try {
      await rejectListing(rejecting.id, reason.trim());
      setRejecting(null);
      refetch();
    } catch (err) {
      setRejectError(err instanceof ApiError ? err.message : "Could not reject this ad.");
    } finally {
      setIsRejecting(false);
    }
  }

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Ad approvals</h2>
        <p className="text-xs text-ink-muted">
          New ads wait here before going live, oldest first. Approving publishes the ad now; rejecting sends it back to
          the seller as a draft with your reason (paid plans are refunded to their wallet).
        </p>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : items.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="No ads waiting" description="New ads will appear here when sellers publish them." />
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-medium text-ink-muted">
            {items.length} {items.length === 1 ? "ad" : "ads"} waiting for approval
          </p>
          {items.map((listing) => (
            <PendingListingCard
              key={listing.id}
              listing={listing}
              isBusy={busyId === listing.id}
              onApprove={() => approve(listing)}
              onReject={() => openReject(listing)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject this ad"
        description="The seller sees this reason and can fix the ad and submit it again."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {REJECTION_REASONS.map((preset) => (
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
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Reason shown to the seller"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {rejectError && <ErrorBanner message={rejectError} />}
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
              onClick={confirmReject}
              disabled={!reason.trim() || isRejecting}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {isRejecting && <Spinner size={14} />}
              Reject ad
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
