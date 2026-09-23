import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, UserX } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { eraseUserData } from "../services/admin";
import { formatDateTime } from "../lib/format";
import type { EraseUserDataReceipt } from "../types/api";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { Spinner } from "../components/Spinner";

export function DataErasurePage() {
  const [userId, setUserId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<EraseUserDataReceipt | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!userId.trim()) return;
    setReceipt(null);
    setError(null);
    setConfirming(true);
  }

  async function confirmErase() {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await eraseUserData(userId.trim());
      setReceipt(result);
      setConfirming(false);
      setUserId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not process this erasure request.");
      setConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">NDPA data-subject deletion</h2>
        <p className="text-xs text-ink-muted">
          Erases biometric images, anonymizes PII, revokes ad-platform connections and refresh tokens. Transactions
          and audit history are retained (anonymized) for financial/legal compliance. This cannot be undone.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="userId" className="mb-1.5 block text-sm font-medium text-ink">
              User ID
            </label>
            <input
              id="userId"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && <ErrorBanner message={error} />}

          <button
            type="submit"
            disabled={!userId.trim()}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserX size={16} />
            Erase user data
          </button>
        </form>
      </Card>

      {receipt && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={18} />
            <h3 className="text-sm font-semibold">Erasure complete</h3>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-muted">User ID</dt>
            <dd className="font-mono text-xs">{receipt.userId}</dd>
            <dt className="text-ink-muted">Biometric records erased</dt>
            <dd>{receipt.biometricVerificationsErased}</dd>
            <dt className="text-ink-muted">Ad connections revoked</dt>
            <dd>{receipt.adAccountConnectionsRevoked}</dd>
            <dt className="text-ink-muted">Refresh tokens revoked</dt>
            <dd>{receipt.refreshTokensRevoked}</dd>
            <dt className="text-ink-muted">Seller profile anonymized</dt>
            <dd>{receipt.sellerProfileAnonymized ? "Yes" : "N/A - not a seller"}</dd>
            <dt className="text-ink-muted">Completed at</dt>
            <dd>{formatDateTime(receipt.erasedAt)}</dd>
          </dl>
        </Card>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle size={20} />
              <h3 className="text-base font-semibold">Confirm data erasure</h3>
            </div>
            <p className="mt-3 text-sm text-ink-muted">
              This will permanently anonymize this user's account and erase their biometric data. This action cannot
              be undone. Are you sure?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmErase}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {isSubmitting && <Spinner size={14} />}
                Yes, erase permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
