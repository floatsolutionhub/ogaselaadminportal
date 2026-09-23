import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { approveStaffOnboarding, getStaffDetail, rejectStaffOnboarding, uploadStaffKycDocument } from "../services/staff";
import { formatDateTime } from "../lib/format";
import type { StaffKycDocumentType, StaffOnboardingStatus } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { FileInput } from "../components/FileInput";

const STATUS_TONE: Record<StaffOnboardingStatus, "warning" | "success" | "danger"> = {
  PendingApproval: "warning",
  Approved: "success",
  Rejected: "danger",
};

const DOC_TYPE_LABEL: Record<StaffKycDocumentType, string> = {
  GovernmentId: "Government ID",
  ProofOfAddress: "Proof of address",
  PassportPhoto: "Passport photo",
};

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data: staff, isLoading, error, refetch } = useApiQuery(() => getStaffDetail(id!), [id]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<StaffKycDocumentType>("GovernmentId");

  async function handleApprove() {
    if (!id) return;
    setIsBusy(true);
    setActionError(null);
    try {
      await approveStaffOnboarding(id);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not approve this staff record.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReject() {
    if (!id || !rejectReason.trim()) return;
    setIsBusy(true);
    setActionError(null);
    try {
      await rejectStaffOnboarding(id, rejectReason.trim());
      setRejecting(false);
      setRejectReason("");
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not reject this staff record.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpload() {
    if (!id || !uploadFile) return;
    setIsBusy(true);
    setActionError(null);
    try {
      await uploadStaffKycDocument(id, uploadFile, uploadType);
      setUploadFile(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not upload that document.");
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !staff) {
    return <ErrorBanner message={error ?? "Staff record not found."} />;
  }

  const canDecide = staff.status === "PendingApproval" && (hasPermission("staff.kyc.approve") || hasPermission("staff.kyc.reject"));

  return (
    <div className="max-w-2xl space-y-6">
      <button type="button" onClick={() => navigate("/staff")} className="text-xs font-medium text-ink-muted hover:text-ink">
        &larr; Back to staff
      </button>

      <Card className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">{staff.name ?? "—"}</h2>
            <p className="text-sm text-ink-muted">{staff.email ?? staff.phone ?? ""}</p>
          </div>
          <Badge tone={STATUS_TONE[staff.status]}>{staff.status}</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-ink-muted">Department</dt>
          <dd className="text-ink">{staff.departmentName}</dd>
          <dt className="text-ink-muted">Unit</dt>
          <dd className="text-ink">{staff.unitName}</dd>
          <dt className="text-ink-muted">Role</dt>
          <dd className="text-ink">{staff.roleName}</dd>
          <dt className="text-ink-muted">Onboarded</dt>
          <dd className="text-ink">{formatDateTime(staff.createdAt)}</dd>
          {staff.decidedAt && (
            <>
              <dt className="text-ink-muted">Decided</dt>
              <dd className="text-ink">{formatDateTime(staff.decidedAt)}</dd>
            </>
          )}
          {staff.rejectionReason && (
            <>
              <dt className="text-ink-muted">Rejection reason</dt>
              <dd className="text-rose-700">{staff.rejectionReason}</dd>
            </>
          )}
        </dl>
      </Card>

      {actionError && <ErrorBanner message={actionError} />}

      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-ink">KYC documents</h3>

        {staff.documents.length === 0 ? (
          <p className="text-sm text-ink-muted">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {staff.documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 text-sm">
                <FileText size={16} className="text-ink-muted" />
                <span className="flex-1 truncate text-ink">{doc.originalFileName}</span>
                <Badge tone="neutral">{DOC_TYPE_LABEL[doc.documentType]}</Badge>
              </li>
            ))}
          </ul>
        )}

        {staff.status === "PendingApproval" && hasPermission("staff.create") && (
          <div className="flex items-end gap-3 border-t border-black/5 pt-4">
            <div className="flex-1">
              <FileInput label="Add document" file={uploadFile} onChange={setUploadFile} />
            </div>
            <select
              value={uploadType}
              onChange={(event) => setUploadType(event.target.value as StaffKycDocumentType)}
              className="h-[42px] rounded-lg border border-black/10 px-3 text-sm"
            >
              <option value="GovernmentId">Government ID</option>
              <option value="ProofOfAddress">Proof of address</option>
              <option value="PassportPhoto">Passport photo</option>
            </select>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!uploadFile || isBusy}
              className="rounded-lg border border-black/10 px-3 py-2.5 text-sm font-semibold text-ink hover:bg-black/5 disabled:opacity-50"
            >
              Upload
            </button>
          </div>
        )}
      </Card>

      {canDecide && (
        <div className="flex gap-3">
          {hasPermission("staff.kyc.approve") && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isBusy}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isBusy ? <Spinner size={16} /> : <CheckCircle2 size={16} />}
              Approve &amp; send credentials
            </button>
          )}
          {hasPermission("staff.kyc.reject") && (
            <button
              type="button"
              onClick={() => setRejecting(true)}
              disabled={isBusy}
              className="flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <XCircle size={16} />
              Reject
            </button>
          )}
        </div>
      )}

      <Modal open={rejecting} onClose={() => setRejecting(false)} title="Reject this staff record">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Reason</label>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={!rejectReason.trim() || isBusy}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {isBusy && <Spinner size={14} />}
              Confirm rejection
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
