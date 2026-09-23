import { useState } from "react";
import { CheckCircle2, XCircle, ArrowUpCircle, ShieldAlert, FileClock } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { getModerationQueue, resolveReport as resolveReportRequest } from "../services/admin";
import { decideManualReview } from "../services/verification";
import { useApiQuery } from "../lib/useApiQuery";
import { formatRelativeAge } from "../lib/format";
import type { ReportDecision, VerificationDecision } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";

export function ModerationQueuePage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getModerationQueue());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleResolveReport(reportId: string, decision: ReportDecision) {
    setBusyId(reportId);
    setActionError(null);
    try {
      await resolveReportRequest(reportId, decision, `${decision} via Ogasela Control Portal`);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not apply that decision.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecideManualReview(verificationId: string, decision: VerificationDecision) {
    setBusyId(verificationId);
    setActionError(null);
    try {
      await decideManualReview(verificationId, decision, `${decision} via Ogasela Control Portal`);
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
        <h2 className="text-sm font-semibold text-ink">Prioritized queue</h2>
        <p className="text-xs text-ink-muted">
          Open reports and pending identity checks, ranked by report count, fraud score, and age.
        </p>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {items.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="Queue is empty" description="Nothing needs moderator attention right now." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  {item.type === "Report" ? (
                    <Badge tone="danger">
                      <ShieldAlert size={12} className="mr-1 inline" /> Report
                    </Badge>
                  ) : (
                    <Badge tone="warning">
                      <FileClock size={12} className="mr-1 inline" /> Manual review
                    </Badge>
                  )}
                  <span className="text-xs text-ink-muted">score {item.priorityScore.toFixed(1)}</span>
                  <span className="text-xs text-ink-muted">&middot; {formatRelativeAge(item.createdAt)}</span>
                </div>
                <p className="truncate text-sm text-ink">{item.summary}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">Target: {item.targetId}</p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {busyId === item.id ? (
                  <Spinner size={20} />
                ) : item.type === "Report" ? (
                  <>
                    <ActionButton tone="success" label="Approve" icon={CheckCircle2} onClick={() => handleResolveReport(item.id, "Approve")} />
                    <ActionButton tone="danger" label="Remove" icon={XCircle} onClick={() => handleResolveReport(item.id, "Remove")} />
                    <ActionButton tone="neutral" label="Escalate" icon={ArrowUpCircle} onClick={() => handleResolveReport(item.id, "Escalate")} />
                  </>
                ) : (
                  <>
                    <ActionButton tone="success" label="Verify" icon={CheckCircle2} onClick={() => handleDecideManualReview(item.id, "Verified")} />
                    <ActionButton tone="danger" label="Fail" icon={XCircle} onClick={() => handleDecideManualReview(item.id, "Failed")} />
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  icon: typeof CheckCircle2;
  tone: "success" | "danger" | "neutral";
  onClick: () => void;
}) {
  const toneClasses = {
    success: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    danger: "border-rose-200 text-rose-700 hover:bg-rose-50",
    neutral: "border-black/10 text-ink-muted hover:bg-black/5",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${toneClasses}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
