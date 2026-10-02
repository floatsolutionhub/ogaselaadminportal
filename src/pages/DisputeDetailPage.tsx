import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, Gavel, Hand, MessageSquare, Send, UserRound } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import { assignDisputeToMe, getDispute, messageDisputeParties, resolveDispute } from "../services/disputes";
import type { AdminDisputeDetail, AdminDisputeParty, DisputeAuthorRole, DisputeEvidence, DisputeOutcome } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { LISTING_STATUS, formatNaira } from "./AdsPage";
import { DISPUTE_OUTCOME, DISPUTE_REASON, DISPUTE_STATUS } from "./DisputesPage";

const textareaClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const partyLabel = (party: AdminDisputeParty) => party.businessName ?? party.name ?? "Ogasela user";
const sideLabel = (party: AdminDisputeParty) => (party.isSeller ? "seller" : "buyer");

function EvidenceTile({ evidence }: { evidence: DisputeEvidence }) {
  return (
    <a href={evidence.url} target="_blank" rel="noreferrer" className="block h-24 w-24 overflow-hidden rounded-lg border border-black/10">
      {evidence.isPdf ? (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-black/[0.03] text-xs text-ink-muted">
          <FileText size={20} /> PDF
        </span>
      ) : (
        <img src={evidence.url} alt="Evidence" className="h-full w-full object-cover" />
      )}
    </a>
  );
}

function PartyCard({ title, party, canViewUsers }: { title: string; party: AdminDisputeParty; canViewUsers: boolean }) {
  return (
    <Card className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <UserRound size={16} />
        </span>
        <div className="min-w-0">
          {canViewUsers ? (
            <Link to={`/users/${party.userId}`} className="block truncate font-medium text-ink hover:text-brand-600">
              {party.name ?? "Unnamed user"}
            </Link>
          ) : (
            <p className="truncate font-medium text-ink">{party.name ?? "Unnamed user"}</p>
          )}
          <p className="truncate text-xs text-ink-muted">{party.businessName ? `Seller · ${party.businessName}` : "Buyer"}</p>
        </div>
      </div>
      <p className="text-xs text-ink-muted">{[party.email, party.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
      {party.isSuspended && <Badge tone="danger">Suspended</Badge>}
    </Card>
  );
}

const AUTHOR_STYLE: Record<DisputeAuthorRole, string> = {
  Raiser: "bg-black/[0.03]",
  Respondent: "bg-black/[0.03]",
  Staff: "bg-brand-50 border border-brand-100",
};

function ResolveModal({
  dispute,
  open,
  busy,
  onClose,
  onConfirm,
}: {
  dispute: AdminDisputeDetail;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (request: { outcome: DisputeOutcome; note: string; takeDownListing: boolean; suspendUserId: string | null }) => void;
}) {
  const [outcome, setOutcome] = useState<DisputeOutcome | "">("");
  const [note, setNote] = useState("");
  const [takeDown, setTakeDown] = useState(false);
  const [suspendUserId, setSuspendUserId] = useState("");

  useEffect(() => {
    if (open) {
      setOutcome("");
      setNote("");
      setTakeDown(false);
      setSuspendUserId("");
    }
  }, [open]);

  const { raisedBy, against } = dispute;
  const outcomeOptions: { value: DisputeOutcome; label: string }[] = [
    { value: "InFavourOfRaiser", label: `In favour of ${partyLabel(raisedBy)} (${sideLabel(raisedBy)}, raised it)` },
    { value: "InFavourOfRespondent", label: `In favour of ${partyLabel(against)} (${sideLabel(against)})` },
    { value: "MutualAgreement", label: "Settled by mutual agreement" },
    { value: "Dismissed", label: "Dismiss - no action needed" },
  ];
  const listingLive = dispute.listing.status === "Active" || dispute.listing.status === "ExpiringSoon";

  return (
    <Modal open={open} onClose={onClose} title={`Resolve ${dispute.reference}`} description="Both parties are notified with your note." maxWidth="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Outcome</label>
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value as DisputeOutcome)} placeholder="Choose an outcome" options={outcomeOptions} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Decision note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Explain the decision - both parties see this."
            className={textareaClassName}
          />
        </div>
        <div className="space-y-3 rounded-xl border border-black/5 bg-black/[0.015] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Follow-up actions (optional)</p>
          <label className={`flex items-center gap-2 text-sm ${listingLive ? "text-ink" : "text-ink-muted"}`}>
            <input
              type="checkbox"
              checked={takeDown}
              disabled={!listingLive}
              onChange={(e) => setTakeDown(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            Take down the ad “{dispute.listing.title}”{!listingLive && " (not live)"}
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Suspend a party</label>
            <Select
              value={suspendUserId}
              onChange={(e) => setSuspendUserId(e.target.value)}
              placeholder="Don't suspend anyone"
              options={[raisedBy, against]
                .filter((p) => !p.isSuspended)
                .map((p) => ({ value: p.userId, label: `${partyLabel(p)} (${sideLabel(p)})` }))}
            />
          </div>
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
            disabled={!outcome || !note.trim() || busy}
            onClick={() =>
              outcome && onConfirm({ outcome, note: note.trim(), takeDownListing: takeDown, suspendUserId: suspendUserId || null })
            }
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy && <Spinner size={14} />} Resolve dispute
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function DisputeDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { user: me, hasPermission } = useAuth();
  const { data: dispute, isLoading, error, refetch } = useApiQuery(() => getDispute(id), [id]);

  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [resolving, setResolving] = useState(false);

  const canManage = hasPermission("disputes.manage");
  const canViewUsers = hasPermission("users.view");

  async function run(key: string, action: () => Promise<unknown>, success: string, failure: string) {
    setBusy(key);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      return true;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : failure);
      return false;
    } finally {
      setBusy(null);
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

  if (error || !dispute) {
    return <ErrorBanner message={error ?? "This dispute could not be found."} />;
  }

  const status = DISPUTE_STATUS[dispute.status];
  const isResolved = dispute.status === "Resolved";
  const assignedToMe = !!me && dispute.assignedToUserId === me.id;
  const listingStatus = LISTING_STATUS[dispute.listing.status];

  return (
    <div className="space-y-4">
      <Link to="/disputes" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> Disputes &amp; Resolutions
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">{dispute.reference}</h2>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="text-xs text-ink-muted">
            {DISPUTE_REASON[dispute.reason]} · opened {formatDateTime(dispute.createdAt)} · handled by{" "}
            {dispute.assignedToName ?? "nobody yet"}
          </p>
        </div>
        {canManage && !isResolved && (
          <div className="flex flex-wrap gap-2">
            {!assignedToMe && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => run("assign", () => assignDisputeToMe(dispute.id), "You're now handling this case.", "Couldn't take the case.")}
                className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink hover:bg-black/5 disabled:opacity-60"
              >
                {busy === "assign" ? <Spinner size={14} /> : <Hand size={15} />} Take this case
              </button>
            )}
            <button
              type="button"
              onClick={() => setResolving(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Gavel size={15} /> Resolve
            </button>
          </div>
        )}
      </div>

      {actionError && <ErrorBanner message={actionError} />}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {isResolved && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <p className="text-sm font-semibold text-ink">{dispute.outcome ? DISPUTE_OUTCOME[dispute.outcome] : "Resolved"}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">{dispute.resolutionNote}</p>
          {dispute.resolvedAt && <p className="mt-2 text-xs text-ink-muted">Resolved {formatDateTime(dispute.resolvedAt)}</p>}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              What {partyLabel(dispute.raisedBy)} ({sideLabel(dispute.raisedBy)}) said
            </p>
            <p className="whitespace-pre-line text-sm text-ink">{dispute.description}</p>
            {dispute.evidence.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dispute.evidence.map((e) => (
                  <EvidenceTile key={e.url} evidence={e} />
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Dispute thread</p>
            {dispute.messages.length === 0 ? (
              <p className="text-sm text-ink-muted">No replies yet.</p>
            ) : (
              <ul className="space-y-2">
                {dispute.messages.map((m) => (
                  <li key={m.id} className={`rounded-xl px-4 py-3 ${AUTHOR_STYLE[m.authorRole]}`}>
                    <p className="text-xs text-ink-muted">
                      <span className="font-semibold text-ink">
                        {m.authorRole === "Staff"
                          ? `${m.authorName} (staff)`
                          : `${m.authorName} (${sideLabel(m.authorRole === "Raiser" ? dispute.raisedBy : dispute.against)})`}
                      </span>{" "}
                      · {formatDateTime(m.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink">{m.body}</p>
                    {m.attachment && (
                      <div className="mt-2">
                        <EvidenceTile evidence={m.attachment} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canManage && !isResolved && (
              <div className="space-y-2 border-t border-black/5 pt-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Message both parties - e.g. ask for a receipt or waybill"
                  className={textareaClassName}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!reply.trim() || !!busy}
                    onClick={async () => {
                      const ok = await run(
                        "reply",
                        () => messageDisputeParties(dispute.id, reply.trim()),
                        "Message sent to both parties.",
                        "Couldn't send the message.",
                      );
                      if (ok) setReply("");
                    }}
                    className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {busy === "reply" ? <Spinner size={14} /> : <Send size={14} />} Send to both parties
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <MessageSquare size={13} /> Their chat about this ad
            </p>
            {dispute.chat.length === 0 ? (
              <p className="text-sm text-ink-muted">They haven't chatted on Ogasela about this ad.</p>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {dispute.chat.map((m, index) => (
                  <li key={index} className={`flex ${m.role === "Seller" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 ${m.role === "Seller" ? "bg-brand-50" : "bg-black/[0.04]"}`}>
                      <p className="text-[11px] text-ink-muted">
                        {m.role} · {formatDateTime(m.sentAt)}
                      </p>
                      {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-1 max-h-40 rounded-lg" />}
                      {m.content && <p className="mt-0.5 whitespace-pre-line text-sm text-ink">{m.content}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <PartyCard title={`Raised by (${sideLabel(dispute.raisedBy)})`} party={dispute.raisedBy} canViewUsers={canViewUsers} />
          <PartyCard title={`Against (${sideLabel(dispute.against)})`} party={dispute.against} canViewUsers={canViewUsers} />
          <Card className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">The ad</p>
            <Link to={`/ads/${dispute.listing.id}`} className="flex items-center gap-3">
              {dispute.listing.thumbnailUrl ? (
                <img src={dispute.listing.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-lg bg-black/5" />
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink hover:text-brand-600">{dispute.listing.title}</span>
                <span className="block text-xs text-ink-muted">{formatNaira(dispute.listing.price)}</span>
              </span>
            </Link>
            <Badge tone={listingStatus.tone}>{listingStatus.label}</Badge>
          </Card>
        </div>
      </div>

      <ResolveModal
        dispute={dispute}
        open={resolving}
        busy={busy === "resolve"}
        onClose={() => setResolving(false)}
        onConfirm={async (request) => {
          const ok = await run("resolve", () => resolveDispute(dispute.id, request), "Dispute resolved. Both parties have been notified.", "Couldn't resolve the dispute.");
          if (ok) setResolving(false);
        }}
      />
    </div>
  );
}
