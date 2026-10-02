import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileText,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
  UserX,
  XCircle,
} from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { formatDateTime, formatRelativeAge } from "../lib/format";
import { eraseUserData } from "../services/admin";
import { getUser, reactivateUser, revokeUserSessions, reviewUserDocument, suspendUser } from "../services/users";
import type { AdminUserDocument } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";

const SUSPENSION_REASONS = [
  "Fraud or scam reports",
  "Selling prohibited items",
  "Abusive behaviour towards other users",
  "Fake identity or documents",
  "Repeated policy violations",
];

const ID_TYPE_LABEL: Record<string, string> = {
  NationalIdCard: "National ID card",
  NinSlip: "NIN slip",
  VotersCard: "Voter's card",
  DriversLicence: "Driver's licence",
  InternationalPassport: "International passport",
};

const DOC_STATUS: Record<string, { label: string; tone: "warning" | "success" | "danger" }> = {
  PendingReview: { label: "Awaiting review", tone: "warning" },
  Approved: { label: "Approved", tone: "success" },
  Rejected: { label: "Rejected", tone: "danger" },
};

const textareaClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/5 bg-black/[0.015] px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

export function UserDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const { data: user, isLoading, error, refetch } = useApiQuery(() => getUser(id), [id]);

  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [suspending, setSuspending] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [eraseText, setEraseText] = useState("");
  const [rejecting, setRejecting] = useState<AdminUserDocument | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const canManage = hasPermission("users.manage");
  const canReviewDocs = hasPermission("users.documents.review");
  const canErase = hasPermission("dataprivacy.erase");

  async function run(key: string, action: () => Promise<unknown>, success: string, failure: string) {
    setBusy(key);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      refetch();
      return true;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : failure);
      return false;
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

  if (error || !user) {
    return <ErrorBanner message={error ?? "This user could not be found."} />;
  }

  const initials = (user.name ?? user.email ?? "?")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-4">
      <Link to="/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> All users
      </Link>

      {actionError && <ErrorBanner message={actionError} />}
      {notice && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={15} /> {notice}
        </p>
      )}

      {/* Profile + actions */}
      <Card className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex flex-1 items-start gap-4">
          {user.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-xl font-semibold text-brand-700">
              {initials || <UserRound size={28} />}
            </div>
          )}
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{user.name ?? "Unnamed user"}</h2>
              <Badge tone={user.role === "Seller" ? "brand" : "neutral"}>{user.role}</Badge>
              {user.isSuspended ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <Mail size={14} /> {user.email ?? "No email"}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <Phone size={14} /> {user.phone ?? "No phone"}
            </p>
            <p className="text-xs text-ink-muted">
              Joined {formatDateTime(user.createdAt)}
              {user.socialLogins.length > 0 && ` · Signs in with ${user.socialLogins.join(", ")}`}
            </p>
            {user.isSuspended && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Suspended {user.suspendedAt ? formatRelativeAge(user.suspendedAt) : ""}: {user.suspensionReason}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:w-60 lg:flex-col">
          {canManage &&
            (user.isSuspended ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run("reactivate", () => reactivateUser(user.id), "Account reactivated.", "Could not reactivate.")}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {busy === "reactivate" ? <Spinner size={14} /> : <ShieldCheck size={15} />} Reactivate account
              </button>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setSuspendReason("");
                  setSuspending(true);
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                <Ban size={15} /> Suspend account
              </button>
            ))}
          {canManage && (
            <button
              type="button"
              disabled={busy !== null || user.stats.activeSessions === 0}
              onClick={() => setConfirmSignOut(true)}
              className="flex items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-black/5 disabled:opacity-50"
            >
              <LogOut size={15} /> Sign out everywhere
            </button>
          )}
          {canErase && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setEraseText("");
                setConfirmErase(true);
              }}
              className="flex items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <UserX size={15} /> Erase personal data
            </button>
          )}
        </div>
      </Card>

      {/* Activity */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Live ads" value={user.stats.liveAds} />
        <Stat label="All ads" value={user.stats.totalAds} />
        <Stat label="Awaiting approval" value={user.stats.pendingAds} />
        <Stat
          label="Rating"
          value={user.stats.reviewCount > 0 ? `${user.stats.averageRating.toFixed(1)} (${user.stats.reviewCount})` : "—"}
        />
        <Stat label="Open reports against" value={user.stats.openReportsAgainst} />
        <Stat label="Conversations" value={user.stats.conversations} />
        <Stat label="Signed-in devices" value={user.stats.activeSessions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Seller */}
        <Card className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Store size={15} /> Seller profile
          </h3>
          {user.seller ? (
            <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
              <dt className="text-ink-muted">Business</dt>
              <dd className="font-medium text-ink">{user.seller.businessName}</dd>
              <dt className="text-ink-muted">Store address</dt>
              <dd className="text-ink">{user.seller.storeAddress ?? "—"}</dd>
              <dt className="text-ink-muted">Verification</dt>
              <dd className="flex items-center gap-1 text-ink">
                {user.seller.verificationStatus === "Verified" && <BadgeCheck size={14} className="text-brand-600" />}
                {user.seller.verificationStatus}
                {user.seller.verifiedAt && <span className="text-ink-muted">· {formatDateTime(user.seller.verifiedAt)}</span>}
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-ink-muted">This is a buyer account - no seller profile.</p>
          )}
        </Card>

        {/* Documents */}
        <Card className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FileText size={15} /> Documents
          </h3>
          {user.documents.length === 0 ? (
            <p className="text-sm text-ink-muted">No ID or utility bill uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {user.documents.map((doc) => {
                const status = DOC_STATUS[doc.status];
                return (
                  <li key={doc.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {doc.type === "IdCard" ? `ID card · ${doc.idType ? ID_TYPE_LABEL[doc.idType] : ""}` : "Utility bill"}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {doc.idNumber && <span className="font-mono">{doc.idNumber} · </span>}
                          Uploaded {formatRelativeAge(doc.createdAt)}
                        </p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    {doc.reviewNote && <p className="text-xs text-rose-700">Reason: {doc.reviewNote}</p>}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-black/5"
                      >
                        <ExternalLink size={12} /> View {doc.contentType === "application/pdf" ? "PDF" : "image"}
                      </a>
                      {canReviewDocs && doc.status === "PendingReview" && (
                        <>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() =>
                              run(`doc-${doc.id}`, () => reviewUserDocument(user.id, doc.id, true), "Document approved.", "Could not approve.")
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                          >
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => {
                              setRejectReason("");
                              setRejecting(doc);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent ads */}
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Recent ads</h3>
        {user.recentListings.length === 0 ? (
          <p className="text-sm text-ink-muted">No ads yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {user.recentListings.map((listing) => (
              <li key={listing.id} className="flex items-center gap-3 py-2.5">
                {listing.thumbnailUrl ? (
                  <img src={listing.thumbnailUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-black/5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{listing.title}</p>
                  <p className="text-xs text-ink-muted">
                    {listing.price !== null ? `₦${listing.price.toLocaleString("en-NG")}` : "Price on request"} · {formatRelativeAge(listing.createdAt)}
                  </p>
                </div>
                <Badge>{listing.status === "PendingReview" ? "Awaiting approval" : listing.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Suspend */}
      <Modal
        open={suspending}
        onClose={() => setSuspending(false)}
        title="Suspend this account"
        description="They'll be signed out everywhere, can't sign back in, and their live ads are paused. You can reactivate later."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {SUSPENSION_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSuspendReason(preset)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  suspendReason === preset ? "border-brand-500 bg-brand-50 text-brand-700" : "border-black/10 text-ink-muted hover:bg-black/5"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Reason (kept in the audit log and shown on this page)"
            className={textareaClassName}
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSuspending(false)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!suspendReason.trim() || busy !== null}
              onClick={async () => {
                const ok = await run("suspend", () => suspendUser(user.id, suspendReason.trim()), "Account suspended.", "Could not suspend.");
                if (ok) setSuspending(false);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {busy === "suspend" && <Spinner size={14} />} Suspend
            </button>
          </div>
        </div>
      </Modal>

      {/* Sign out everywhere */}
      <Modal
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out everywhere?"
        description={`Ends this user's ${user.stats.activeSessions} active session${user.stats.activeSessions === 1 ? "" : "s"}. They can sign in again.`}
      >
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmSignOut(false)}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={async () => {
              const ok = await run("signout", () => revokeUserSessions(user.id), "Signed out of every device.", "Could not sign them out.");
              if (ok) setConfirmSignOut(false);
            }}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy === "signout" && <Spinner size={14} />} Sign out everywhere
          </button>
        </div>
      </Modal>

      {/* Erase */}
      <Modal
        open={confirmErase}
        onClose={() => setConfirmErase(false)}
        title="Erase this user's personal data?"
        description="Permanent: wipes their name, contact details, photo, documents and biometric data under NDPA. Financial and audit records are kept. Type ERASE to confirm."
      >
        <div className="space-y-4">
          <input
            value={eraseText}
            onChange={(e) => setEraseText(e.target.value)}
            placeholder="ERASE"
            className={textareaClassName}
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmErase(false)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={eraseText !== "ERASE" || busy !== null}
              onClick={async () => {
                const ok = await run("erase", () => eraseUserData(user.id), "Personal data erased.", "Could not erase this user's data.");
                if (ok) setConfirmErase(false);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {busy === "erase" && <Spinner size={14} />} Erase permanently
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject document */}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject this document"
        description="The user is notified with your reason and can upload it again."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {["The photo is blurry or cut off.", "The document has expired.", "The name doesn't match the account.", "This isn't an accepted document."].map(
              (preset) => (
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
              ),
            )}
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
              disabled={!rejectReason.trim() || busy !== null || !rejecting}
              onClick={async () => {
                if (!rejecting) return;
                const ok = await run(
                  `doc-${rejecting.id}`,
                  () => reviewUserDocument(user.id, rejecting.id, false, rejectReason.trim()),
                  "Document rejected - the user has been notified.",
                  "Could not reject.",
                );
                if (ok) setRejecting(null);
              }}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              Reject document
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
