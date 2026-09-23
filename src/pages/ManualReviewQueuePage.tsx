import { useState } from "react";
import { CheckCircle2, XCircle, FileClock } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { getManualReviewQueue } from "../services/admin";
import { decideManualReview } from "../services/verification";
import { useApiQuery } from "../lib/useApiQuery";
import { formatRelativeAge } from "../lib/format";
import type { VerificationDecision } from "../types/api";
import { Card } from "../components/Card";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";

export function ManualReviewQueuePage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getManualReviewQueue());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function decide(verificationId: string, decision: VerificationDecision) {
    setBusyId(verificationId);
    setActionError(null);
    try {
      await decideManualReview(verificationId, decision, `${decision} via Bira Control Portal`);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not apply that decision.");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Pending identity checks</h2>
        <p className="text-xs text-ink-muted">Oldest first - automatic scoring couldn't confidently decide these.</p>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {items.length === 0 ? (
        <EmptyState icon={FileClock} title="Nothing to review" description="No verification submissions are waiting on a manual decision." />
      ) : (
        <Card className="overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Attempt</th>
                <th className="px-5 py-3">Liveness</th>
                <th className="px-5 py-3">ID match</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3 text-right">Decision</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.verificationId} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-ink-muted">{item.sellerId}</td>
                  <td className="px-5 py-3">{item.attemptNumber}</td>
                  <td className="px-5 py-3">{item.livenessScore?.toFixed(1) ?? "—"}</td>
                  <td className="px-5 py-3">{item.idMatchScore?.toFixed(1) ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatRelativeAge(item.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {busyId === item.verificationId ? (
                        <Spinner size={18} />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => decide(item.verificationId, "Verified")}
                            className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 size={13} /> Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => decide(item.verificationId, "Failed")}
                            className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle size={13} /> Fail
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
