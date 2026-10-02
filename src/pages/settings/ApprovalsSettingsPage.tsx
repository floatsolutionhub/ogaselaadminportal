import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { ApiError } from "../../lib/apiClient";
import { useApiQuery } from "../../lib/useApiQuery";
import { formatDateTime } from "../../lib/format";
import { getPlatformSettings, updatePlatformSettings } from "../../services/settings";
import type { UpdatePlatformSettings } from "../../types/api";
import { Card } from "../../components/Card";
import { Spinner } from "../../components/Spinner";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Toggle } from "../../components/Toggle";
import { SettingsHeader } from "./SettingsHeader";

export function ApprovalsSettingsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getPlatformSettings());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cap, setCap] = useState("");

  useEffect(() => {
    if (data) setCap(String(data.freePlanCap));
  }, [data]);

  async function save(changes: UpdatePlatformSettings, message: string) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await updatePlatformSettings(changes);
      setNotice(message);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't save the setting.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorBanner message={error ?? "Couldn't load settings."} />;
  }

  const capNumber = Number(cap);
  const capValid = cap !== "" && Number.isInteger(capNumber) && capNumber >= 0 && capNumber <= 100;

  return (
    <div className="space-y-4">
      <SettingsHeader
        title="Ad approvals"
        description={`Rules for new ads. ${data.updatedAt ? `Settings last changed ${formatDateTime(data.updatedAt)}.` : ""}`}
      />

      {actionError && <ErrorBanner message={actionError} />}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <Check size={16} /> {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Approve ads before they go live</h3>
            <p className="mt-1 text-xs text-ink-muted">
              {data.requireListingApproval
                ? "On - new ads wait in Ad Approvals until a moderator approves them. Paid plans start their run on approval, and a rejection refunds the seller."
                : "Off - ads go live as soon as the seller posts them. Moderators can still take ads down from All Ads."}
            </p>
          </div>
          <Toggle
            label="Approve ads before they go live"
            checked={data.requireListingApproval}
            disabled={busy}
            onChange={(on) =>
              save(
                { requireListingApproval: on },
                on ? "New ads now wait for approval." : "New ads now go live straight away. Ads already waiting still need a decision.",
              )
            }
          />
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink">Free ads per seller</h3>
          <p className="mt-1 text-xs text-ink-muted">
            How many free-plan ads one seller can have live or awaiting approval at the same time. Above this, they need a paid plan.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              aria-label="Free ads per seller"
              className="w-24 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              disabled={busy || !capValid || capNumber === data.freePlanCap}
              onClick={() => save({ freePlanCap: capNumber }, `Sellers can now have up to ${capNumber} free ads at a time.`)}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy && <Spinner size={14} />} Save
            </button>
          </div>
          {!capValid && <p className="mt-1 text-xs text-rose-600">Enter a whole number from 0 to 100.</p>}
        </Card>
      </div>
    </div>
  );
}
