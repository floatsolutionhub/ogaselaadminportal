import { useEffect, useState } from "react";
import { CalendarClock, Download, FlaskConical, ListChecks, NotebookPen, Search, Sparkles, Trash2 } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { formatDateTime, formatNumber } from "../lib/format";
import {
  deleteInterestSignup,
  exportInterestSignups,
  getInterestSignupSummary,
  getInterestSignups,
  updateInterestSignup,
} from "../services/interestSignups";
import type { AdminInterestSignup, InterestDevicePlatform, InterestKind, InterestSignupStatus } from "../types/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Pagination } from "../components/Pagination";
import { Modal } from "../components/Modal";

const PAGE_SIZE = 25;

const STATUS_OPTIONS: { value: InterestSignupStatus; label: string }[] = [
  { value: "New", label: "New" },
  { value: "Contacted", label: "Contacted" },
  { value: "Invited", label: "Invited" },
  { value: "Joined", label: "Joined" },
  { value: "Declined", label: "Declined" },
];

const STATUS_TONE: Record<InterestSignupStatus, "warning" | "brand" | "success" | "neutral"> = {
  New: "warning",
  Contacted: "brand",
  Invited: "brand",
  Joined: "success",
  Declined: "neutral",
};

const KIND_TABS: { value: InterestKind | ""; label: string }[] = [
  { value: "Waitlist", label: "Waiting list" },
  { value: "Tester", label: "Testers" },
  { value: "", label: "All" },
];

const INTENT_LABEL = { Buy: "Buying", Sell: "Selling", Both: "Buying & selling" } as const;
const DEVICE_LABEL = { Android: "Android", IOS: "iPhone (iOS)" } as const;

/** People who asked on ogasela.com to test the app or to be told when it's in the stores. */
export function InterestSignupsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing.interest.manage");
  const [kind, setKind] = useState<InterestKind | "">("Waitlist");
  const [status, setStatus] = useState<InterestSignupStatus | "">("");
  const [device, setDevice] = useState<InterestDevicePlatform | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<AdminInterestSignup | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [deleting, setDeleting] = useState<AdminInterestSignup | null>(null);

  // Search as the admin types, without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = {
    kind: kind || undefined,
    status: status || undefined,
    search: search || undefined,
    devicePlatform: device || undefined,
  };
  const { data, isLoading, error, refetch } = useApiQuery(
    () => getInterestSignups({ ...filters, page, pageSize: PAGE_SIZE }),
    [kind, status, search, device, page],
  );
  const summary = useApiQuery(getInterestSignupSummary, []);
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const filtered = Boolean(status || search || device);

  async function run(id: string, action: () => Promise<void>, success: string) {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      refetch();
      summary.refetch();
      return true;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "That didn't work. Please try again.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      await exportInterestSignups(filters);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not export the list.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Waitlist &amp; testers</h2>
          <p className="text-xs text-ink-muted">
            People who joined the waiting list or volunteered to test from ogasela.com. Newest first. Each one consented to be
            contacted about this only - delete them if they ask to be removed.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-black/5 disabled:opacity-60"
          >
            {exporting ? <Spinner size={16} /> : <Download size={16} />} Export CSV
          </button>
        )}
      </div>

      {summary.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Waiting list"
            value={formatNumber(summary.data.waitlistTotal)}
            hint={`${formatNumber(summary.data.waitlistNew)} not contacted yet`}
            icon={ListChecks}
          />
          <StatCard
            label="Testers"
            value={formatNumber(summary.data.testersTotal)}
            hint={`${formatNumber(summary.data.testersNew)} not contacted yet`}
            icon={FlaskConical}
            tone="violet"
          />
          <StatCard
            label="New (all lists)"
            value={formatNumber(summary.data.waitlistNew + summary.data.testersNew)}
            hint="Status still New"
            icon={Sparkles}
            tone="amber"
          />
          <StatCard
            label="Last 7 days"
            value={formatNumber(summary.data.last7Days)}
            hint="New signups this week"
            icon={CalendarClock}
            tone="sky"
          />
        </div>
      )}

      <Card className="flex flex-wrap items-end gap-3">
        <div className="flex rounded-lg border border-black/10 p-0.5">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setKind(tab.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                kind === tab.value ? "bg-brand-600 text-white" : "text-ink-muted hover:bg-black/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, email or phone"
              className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as InterestSignupStatus | "");
              setPage(1);
            }}
            options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Phone</label>
          <Select
            value={device}
            onChange={(e) => {
              setDevice(e.target.value as InterestDevicePlatform | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All phones" },
              { value: "Android", label: "Android" },
              { value: "IOS", label: "iPhone (iOS)" },
            ]}
          />
        </div>
      </Card>

      {notice && <p className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{notice}</p>}
      {actionError && <ErrorBanner message={actionError} />}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={filtered ? "No signups match" : "No signups yet"}
          description={filtered ? "Try a different search or filter." : "Signups from the website's forms will appear here."}
        />
      ) : (
        <>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Person</th>
                  {kind === "" && <th className="px-5 py-3">List</th>}
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">Signed up</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((signup) => (
                  <tr key={signup.id} className="border-b border-black/5 align-top last:border-0 hover:bg-black/[0.015]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{signup.name}</p>
                      <a href={`mailto:${signup.email}`} className="block text-xs text-brand-700 hover:underline">
                        {signup.email}
                      </a>
                      {signup.phone && <p className="text-xs text-ink-muted">{signup.phone}</p>}
                    </td>
                    {kind === "" && (
                      <td className="px-5 py-3">
                        <Badge tone={signup.kind === "Tester" ? "brand" : "neutral"}>
                          {signup.kind === "Tester" ? "Tester" : "Waiting list"}
                        </Badge>
                      </td>
                    )}
                    <td className="px-5 py-3 text-xs text-ink-muted">
                      {[
                        signup.state,
                        signup.intent && INTENT_LABEL[signup.intent],
                        signup.devicePlatform && DEVICE_LABEL[signup.devicePlatform],
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {signup.notes && <p className="mt-1 max-w-xs whitespace-pre-line text-ink">Note: {signup.notes}</p>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDateTime(signup.createdAt)}</td>
                    <td className="px-5 py-3">
                      {canManage ? (
                        <Select
                          aria-label={`Status for ${signup.name}`}
                          value={signup.status}
                          disabled={busyId === signup.id}
                          onChange={(e) => {
                            const next = e.target.value as InterestSignupStatus;
                            run(signup.id, () => updateInterestSignup(signup.id, { status: next }), `${signup.name} marked ${next}.`);
                          }}
                          options={STATUS_OPTIONS}
                          className="!w-32 !py-1.5"
                        />
                      ) : (
                        <Badge tone={STATUS_TONE[signup.status]}>{signup.status}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {canManage && (
                        <div className="flex justify-end gap-1">
                          {busyId === signup.id ? (
                            <Spinner size={18} />
                          ) : (
                            <>
                              <button
                                type="button"
                                title="Notes"
                                aria-label={`Notes for ${signup.name}`}
                                onClick={() => {
                                  setNotesDraft(signup.notes ?? "");
                                  setEditingNotes(signup);
                                }}
                                className="rounded-lg p-2 text-ink-muted hover:bg-black/5"
                              >
                                <NotebookPen size={16} />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                aria-label={`Delete ${signup.name}`}
                                onClick={() => setDeleting(signup)}
                                className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination page={page} totalPages={totalPages} totalCount={data.totalCount} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={!!editingNotes}
        onClose={() => setEditingNotes(null)}
        title={`Notes on ${editingNotes?.name ?? ""}`}
        description="Only staff see these. Don't record anything the person wouldn't expect us to keep."
      >
        <div className="space-y-4">
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="e.g. Sent TestFlight invite on 20 Oct"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingNotes(null)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={async () => {
                if (!editingNotes) return;
                const target = editingNotes;
                if (await run(target.id, () => updateInterestSignup(target.id, { notes: notesDraft }), "Notes saved.")) {
                  setEditingNotes(null);
                }
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Save notes
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this signup?"
        description={`${deleting?.name ?? ""} (${deleting?.email ?? ""}) will be permanently removed from the ${
          deleting?.kind === "Tester" ? "testers list" : "waiting list"
        }. Use this when someone asks to be taken off. It can't be undone.`}
      >
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setDeleting(null)}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={async () => {
              if (!deleting) return;
              const target = deleting;
              if (await run(target.id, () => deleteInterestSignup(target.id), `${target.name} was deleted.`)) {
                setDeleting(null);
              }
            }}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            Delete permanently
          </button>
        </div>
      </Modal>
    </div>
  );
}
