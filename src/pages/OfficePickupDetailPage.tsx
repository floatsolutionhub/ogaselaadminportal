import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, MapPin, RotateCcw, UserRound } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import { getOfficePickup, refundOfficePickup, updateOfficePickupStatus } from "../services/officePickups";
import type { AdminOfficePickupDetail, AdminOfficePickupParty, OfficePickupStatus } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { OFFICE_PICKUP_STATUS, formatKobo } from "./OfficePickupsPage";

const textareaClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/** The button label for moving a request to each stage. */
const ACTION_LABEL: Partial<Record<OfficePickupStatus, string>> = {
  ItemReceived: "Seller dropped off the item",
  InspectionPassed: "Passed inspection",
  InspectionFailed: "Failed inspection",
  ReadyForCollection: "Ready for pickup/delivery",
  OutForDelivery: "Send out for delivery",
  Completed: "Handed over to buyer",
};

function PartyCard({ title, party, canViewUsers }: { title: string; party: AdminOfficePickupParty; canViewUsers: boolean }) {
  return (
    <Card className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <UserRound size={16} />
        </span>
        {canViewUsers ? (
          <Link to={`/users/${party.userId}`} className="truncate font-medium text-ink hover:text-brand-600">
            {party.name ?? "Unnamed user"}
          </Link>
        ) : (
          <p className="truncate font-medium text-ink">{party.name ?? "Unnamed user"}</p>
        )}
      </div>
      <p className="text-xs text-ink-muted">{[party.email, party.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
    </Card>
  );
}

function StatusModal({
  request,
  target,
  busy,
  onClose,
  onConfirm,
}: {
  request: AdminOfficePickupDetail;
  target: OfficePickupStatus | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (note: string | null, deliveryAddress: string | null) => void;
}) {
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (target) {
      setNote("");
      setAddress("");
    }
  }, [target]);

  if (!target) return null;
  const needsNote = target === "InspectionFailed";
  const needsAddress = target === "OutForDelivery";
  const valid = (!needsNote || note.trim()) && (!needsAddress || address.trim());

  return (
    <Modal
      open
      onClose={onClose}
      title={ACTION_LABEL[target] ?? OFFICE_PICKUP_STATUS[target].label}
      description={`${request.reference} - the buyer is notified${target === "ItemReceived" || target === "Completed" || target.startsWith("Inspection") ? " (and the seller)" : ""}.`}
      maxWidth="lg"
    >
      <div className="space-y-3">
        {needsAddress && (
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Delivery address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={500} className={textareaClassName} />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            {needsNote ? "What's wrong with the item?" : "Note for the buyer and seller (optional)"}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={needsNote ? "e.g. The screen is cracked and doesn't match the ad photos." : undefined}
            className={textareaClassName}
          />
        </div>
        {target === "InspectionFailed" && (
          <p className="text-xs text-ink-muted">After this, refund the buyer from this page - they get back everything less the 1% cancellation fee.</p>
        )}
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
            disabled={!valid || busy}
            onClick={() => onConfirm(note.trim() || null, needsAddress ? address.trim() : null)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy && <Spinner size={14} />} Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RefundModal({
  request,
  open,
  busy,
  onClose,
  onConfirm,
}: {
  request: AdminOfficePickupDetail;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason(request.cancellationReason ?? (request.status === "InspectionFailed" ? "Item failed quality inspection" : ""));
  }, [open, request.cancellationReason, request.status]);

  return (
    <Modal open={open} onClose={onClose} title={`Refund ${request.reference}`} description="Paid back to the buyer's card or account through the payment gateway. This can't be undone." maxWidth="lg">
      <div className="space-y-3">
        <dl className="space-y-1.5 rounded-xl border border-black/5 bg-black/[0.015] p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Total paid</dt>
            <dd className="text-ink">{formatKobo(request.totalKobo)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Cancellation fee (1% of item)</dt>
            <dd className="text-ink">- {formatKobo(request.cancellationFeePreviewKobo)}</dd>
          </div>
          <div className="flex justify-between border-t border-black/5 pt-1.5 font-semibold">
            <dt className="text-ink">Refund to buyer</dt>
            <dd className="text-ink">{formatKobo(request.refundPreviewKobo)}</dd>
          </div>
        </dl>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} className={textareaClassName} />
        </div>
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
            {busy && <Spinner size={14} />} Refund {formatKobo(request.refundPreviewKobo)}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function OfficePickupDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const { data: request, isLoading, error, refetch } = useApiQuery(() => getOfficePickup(id), [id]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [target, setTarget] = useState<OfficePickupStatus | null>(null);
  const [refunding, setRefunding] = useState(false);

  const canManage = hasPermission("officepickup.manage");
  const canRefund = hasPermission("officepickup.refund");
  const canViewUsers = hasPermission("users.view");

  async function run(action: () => Promise<unknown>, success: string, failure: string) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      setTarget(null);
      setRefunding(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusy(false);
      refetch();
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !request) {
    return <ErrorBanner message={error ?? "This office pickup request could not be found."} />;
  }

  const status = OFFICE_PICKUP_STATUS[request.status];
  const openCancellation = request.cancellationRequestedAt && request.status !== "Refunded";

  return (
    <div className="space-y-4">
      <Link to="/office-pickups" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> Office Pickup
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">{request.reference}</h2>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="text-xs text-ink-muted">
            {request.listingTitle} · requested {formatDateTime(request.createdAt)}
            {request.paidAt && ` · paid ${formatDateTime(request.paidAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage &&
            request.nextStatuses.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => setTarget(s)}
                className={
                  s === "InspectionFailed"
                    ? "rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    : "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                }
              >
                {ACTION_LABEL[s] ?? OFFICE_PICKUP_STATUS[s].label}
              </button>
            ))}
          {canRefund && request.canRefund && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setRefunding(true)}
              className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-black/5 disabled:opacity-60"
            >
              <RotateCcw size={15} /> Refund buyer
            </button>
          )}
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {openCancellation && (
        <Card className="border-amber-200 bg-amber-50/60">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertTriangle size={16} className="text-amber-600" /> The buyer asked to cancel on {formatDateTime(request.cancellationRequestedAt!)}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{request.cancellationReason}</p>
        </Card>
      )}

      {request.status === "Refunded" && request.refundedKobo !== null && (
        <Card className="border-black/10 bg-black/[0.02]">
          <p className="text-sm font-semibold text-ink">
            Refunded {formatKobo(request.refundedKobo)} on {request.refundedAt ? formatDateTime(request.refundedAt) : ""}
          </p>
          <p className="mt-1 text-sm text-ink-muted">Cancellation fee kept: {formatKobo(request.cancellationFeeKobo ?? 0)}</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="flex gap-4">
            {request.listingThumbnailUrl && (
              <img src={request.listingThumbnailUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <Link to={`/ads/${request.listingId}`} className="block truncate font-medium text-ink hover:text-brand-600">
                {request.listingTitle}
              </Link>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Item price</dt>
                  <dd className="text-ink">{formatKobo(request.itemPriceKobo)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Office pickup fee (3%)</dt>
                  <dd className="text-ink">{formatKobo(request.serviceFeeKobo)}</dd>
                </div>
                <div className="flex justify-between border-t border-black/5 pt-1 font-semibold">
                  <dt className="text-ink">Total paid</dt>
                  <dd className="text-ink">{formatKobo(request.totalKobo)}</dd>
                </div>
              </dl>
              {request.paymentReference && <p className="text-xs text-ink-muted">Payment reference: {request.paymentReference}</p>}
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Activity</p>
            {request.activities.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing yet.</p>
            ) : (
              <ol className="space-y-3">
                {request.activities.map((a, i) => (
                  <li key={`${a.createdAt}-${i}`} className="flex gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? "bg-brand-500" : "bg-black/15"}`} />
                    <div>
                      <p className="text-sm font-medium text-ink">{a.title}</p>
                      {a.note && <p className="whitespace-pre-line text-sm text-ink-muted">{a.note}</p>}
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(a.createdAt)}
                        {a.actorName && ` · ${a.actorName}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Branch</p>
            <p className="font-medium text-ink">{request.branch.name}</p>
            <p className="flex items-start gap-1.5 text-sm text-ink-muted">
              <MapPin size={14} className="mt-0.5 shrink-0" /> {request.branch.address}
            </p>
            {request.fulfilment && (
              <p className="pt-1 text-sm text-ink">
                {request.fulfilment === "HomeDelivery" ? `Home delivery to ${request.deliveryAddress}` : "Collected at the branch"}
              </p>
            )}
          </Card>
          <PartyCard title="Buyer" party={request.buyer} canViewUsers={canViewUsers} />
          <PartyCard title="Seller" party={request.seller} canViewUsers={canViewUsers} />
        </div>
      </div>

      <StatusModal
        request={request}
        target={target}
        busy={busy}
        onClose={() => setTarget(null)}
        onConfirm={(note, deliveryAddress) =>
          target &&
          run(
            () => updateOfficePickupStatus(request.id, { status: target, note, deliveryAddress }),
            `Moved to "${OFFICE_PICKUP_STATUS[target].label}" - the buyer has been notified.`,
            "Couldn't update the request.",
          )
        }
      />
      <RefundModal
        request={request}
        open={refunding}
        busy={busy}
        onClose={() => setRefunding(false)}
        onConfirm={(reason) =>
          run(() => refundOfficePickup(request.id, reason), "Refund sent. The buyer and seller have been notified.", "Couldn't refund.")
        }
      />
    </div>
  );
}
