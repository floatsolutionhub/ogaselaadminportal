import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building, MapPin, PackageCheck, Pencil, Plus, Search } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import {
  getOfficeBranches,
  getOfficePickupCategories,
  getOfficePickups,
  saveOfficeBranch,
  setOfficePickupCategory,
} from "../services/officePickups";
import type { AdminOfficeBranch, OfficePickupCategory, OfficePickupStatus, SaveOfficeBranchRequest } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Pagination } from "../components/Pagination";
import { Modal } from "../components/Modal";
import { Toggle } from "../components/Toggle";

const PAGE_SIZE = 25;

type Tone = "neutral" | "brand" | "warning" | "danger" | "success";

export const OFFICE_PICKUP_STATUS: Record<OfficePickupStatus, { label: string; tone: Tone }> = {
  AwaitingPayment: { label: "Awaiting payment", tone: "neutral" },
  PaymentFailed: { label: "Payment failed", tone: "neutral" },
  PaymentCancelled: { label: "Payment cancelled", tone: "neutral" },
  PaymentConfirmed: { label: "Awaiting drop-off", tone: "warning" },
  ItemReceived: { label: "Item received", tone: "brand" },
  InspectionPassed: { label: "Passed inspection", tone: "brand" },
  InspectionFailed: { label: "Failed inspection", tone: "danger" },
  ReadyForCollection: { label: "Ready for pickup/delivery", tone: "brand" },
  OutForDelivery: { label: "Out for delivery", tone: "brand" },
  Completed: { label: "Completed", tone: "success" },
  Refunded: { label: "Refunded", tone: "neutral" },
};

/** Amounts from the API are kobo. */
export function formatKobo(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

const inputClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

type Tab = "requests" | "branches" | "categories";

export function OfficePickupsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab | null) ?? "requests";
  const tabs: { key: Tab; label: string }[] = [
    { key: "requests", label: "Requests" },
    { key: "branches", label: "Branches" },
    { key: "categories", label: "Eligible categories" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Office Pickup</h2>
        <p className="text-xs text-ink-muted">
          Buyers pay for an item plus a 3% fee, the seller drops it at a branch, and we inspect it before the buyer collects it.
          Refunds keep a 1% cancellation fee.
        </p>
      </div>

      <div className="flex gap-1 border-b border-black/5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams(t.key === "requests" ? {} : { tab: t.key })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? "border-brand-500 text-brand-700" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "requests" && <RequestsTab />}
      {tab === "branches" && <BranchesTab />}
      {tab === "categories" && <CategoriesTab />}
    </div>
  );
}

function RequestsTab() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OfficePickupStatus | "">("");
  const [branchId, setBranchId] = useState("");
  const [cancellationRequested, setCancellationRequested] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const branches = useApiQuery(() => getOfficeBranches(), []);
  const { data, isLoading, error } = useApiQuery(
    () =>
      getOfficePickups({
        search: search || undefined,
        status: status || undefined,
        branchId: branchId || undefined,
        cancellationRequested,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, status, branchId, cancellationRequested, page],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;
  const filtered = !!(search || status || branchId || cancellationRequested);

  return (
    <>
      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Reference, ad title, buyer or seller"
              className={`${inputClassName} pl-9`}
            />
          </div>
        </div>
        <div className="w-52">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Stage</label>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OfficePickupStatus | "");
              setPage(1);
            }}
            options={[
              { value: "", label: "All paid requests" },
              ...(Object.keys(OFFICE_PICKUP_STATUS) as OfficePickupStatus[]).map((s) => ({
                value: s,
                label: OFFICE_PICKUP_STATUS[s].label,
              })),
            ]}
          />
        </div>
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Branch</label>
          <Select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            options={[{ value: "", label: "All branches" }, ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))]}
          />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={cancellationRequested}
            onChange={(e) => {
              setCancellationRequested(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 accent-brand-500"
          />
          Cancellation requested
        </label>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={filtered ? "No requests match" : "No office pickups yet"}
          description={filtered ? "Try a different search or filter." : "Paid office pickup requests from the app will appear here."}
        />
      ) : (
        <>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">Seller</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Total paid</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="px-5 py-3">Requested</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => {
                  const s = OFFICE_PICKUP_STATUS[r.status];
                  return (
                    <tr key={r.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]">
                      <td className="px-5 py-3">
                        <Link to={`/office-pickups/${r.id}`} className="block">
                          <span className="block font-medium text-ink hover:text-brand-600">{r.reference}</span>
                          <span className="block max-w-[240px] truncate text-xs text-ink-muted">{r.listingTitle}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{r.buyerName ?? "Unnamed user"}</td>
                      <td className="px-5 py-3 text-ink-muted">{r.sellerName ?? "Unnamed user"}</td>
                      <td className="px-5 py-3 text-ink-muted">{r.branchName}</td>
                      <td className="px-5 py-3 text-ink">{formatKobo(r.totalKobo)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={s.tone}>{s.label}</Badge>
                          {r.cancellationRequested && r.status !== "Refunded" && <Badge tone="danger">Wants to cancel</Badge>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Pagination page={page} totalPages={totalPages} totalCount={data.totalCount} onPageChange={setPage} />
        </>
      )}
    </>
  );
}

const EMPTY_BRANCH: SaveOfficeBranchRequest = {
  name: "",
  address: "",
  state: "",
  city: null,
  phone: null,
  openingHours: null,
  latitude: 0,
  longitude: 0,
  isActive: true,
};

function BranchesTab() {
  const { hasPermission } = useAuth();
  const canSetup = hasPermission("officepickup.setup");
  const { data, isLoading, error, refetch } = useApiQuery(() => getOfficeBranches(), []);
  const [editing, setEditing] = useState<AdminOfficeBranch | "new" | null>(null);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">Only active branches are offered in the app, nearest to the buyer first.</p>
        {canSetup && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={15} /> Add branch
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Building} title="No branches yet" description="Add a branch so buyers can start requesting office pickup." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((b) => (
            <Card key={b.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{b.name}</p>
                  <p className="text-xs text-ink-muted">{[b.city, b.state].filter(Boolean).join(", ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                  {canSetup && (
                    <button
                      type="button"
                      onClick={() => setEditing(b)}
                      aria-label={`Edit ${b.name}`}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-black/5 hover:text-ink"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              </div>
              <p className="flex items-start gap-1.5 text-sm text-ink">
                <MapPin size={14} className="mt-0.5 shrink-0 text-ink-muted" /> {b.address}
              </p>
              <p className="text-xs text-ink-muted">
                {[b.phone, b.openingHours].filter(Boolean).join(" · ") || "No phone or opening hours set"}
              </p>
              <p className="text-xs text-ink-muted">
                {b.openRequests} open {b.openRequests === 1 ? "request" : "requests"} · {b.latitude}, {b.longitude}
              </p>
            </Card>
          ))}
        </div>
      )}

      <BranchModal
        branch={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refetch();
        }}
      />
    </>
  );
}

function BranchModal({
  branch,
  onClose,
  onSaved,
}: {
  branch: AdminOfficeBranch | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SaveOfficeBranchRequest>(EMPTY_BRANCH);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branch) return;
    const initial = branch === "new" ? EMPTY_BRANCH : branch;
    setForm({ ...initial });
    setLatitude(branch === "new" ? "" : String(branch.latitude));
    setLongitude(branch === "new" ? "" : String(branch.longitude));
    setError(null);
  }, [branch]);

  const lat = Number(latitude);
  const lng = Number(longitude);
  const coordsValid = latitude.trim() !== "" && longitude.trim() !== "" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const valid = form.name.trim() && form.address.trim() && form.state.trim() && coordsValid;

  async function save() {
    if (!branch || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await saveOfficeBranch(branch === "new" ? null : branch.id, {
        ...form,
        city: form.city?.trim() || null,
        phone: form.phone?.trim() || null,
        openingHours: form.openingHours?.trim() || null,
        latitude: lat,
        longitude: lng,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the branch.");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof SaveOfficeBranchRequest, label: string, placeholder?: string) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <input
        value={(form[key] as string | null) ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );

  return (
    <Modal open={branch !== null} onClose={onClose} title={branch === "new" ? "Add branch" : "Edit branch"} maxWidth="lg">
      <div className="space-y-3">
        {field("name", "Branch name", "e.g. Ikeja")}
        {field("address", "Street address", "Where sellers drop off and buyers collect")}
        <div className="grid grid-cols-2 gap-3">
          {field("state", "State", "e.g. Lagos")}
          {field("city", "City (optional)")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("phone", "Phone (optional)")}
          {field("openingHours", "Opening hours (optional)", "Mon-Sat, 9am-6pm")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Latitude</label>
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="6.6018" className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Longitude</label>
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="3.3515" className={inputClassName} />
          </div>
        </div>
        <p className="text-xs text-ink-muted">
          Used to show buyers their nearest branch. In Google Maps, right-click the building and click the coordinates to copy them.
        </p>
        <label className="flex items-center justify-between rounded-lg border border-black/5 px-3 py-2.5 text-sm text-ink">
          Offer this branch in the app
          <Toggle checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} label="Branch active" />
        </label>
        {error && <ErrorBanner message={error} />}
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
            onClick={save}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy && <Spinner size={14} />} Save branch
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CategoriesTab() {
  const { hasPermission } = useAuth();
  const canSetup = hasPermission("officepickup.setup");
  const { data, isLoading, error, refetch } = useApiQuery(() => getOfficePickupCategories(), []);
  const [saving, setSaving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggle(category: OfficePickupCategory, eligible: boolean) {
    setSaving(category.id);
    setActionError(null);
    try {
      await setOfficePickupCategory(category.id, eligible);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't update the category.");
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (error || !data) return <ErrorBanner message={error ?? "Couldn't load categories."} />;

  const parents = data.filter((c) => !c.parentCategoryId);
  const childrenOf = (id: string) => data.filter((c) => c.parentCategoryId === id);

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        The Request Office Pickup button only shows on ads in these categories. Switching a category on covers all its subcategories.
      </p>
      {actionError && <ErrorBanner message={actionError} />}
      {parents.map((parent) => (
        <Card key={parent.id} className="!p-0">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-semibold text-ink">{parent.name}</span>
            <Toggle
              checked={parent.isOfficePickupEligible}
              disabled={!canSetup || saving === parent.id}
              onChange={(eligible) => toggle(parent, eligible)}
              label={`Office pickup for ${parent.name}`}
            />
          </div>
          {childrenOf(parent.id).length > 0 && (
            <ul className="border-t border-black/5">
              {childrenOf(parent.id).map((child) => (
                <li key={child.id} className="flex items-center justify-between px-5 py-2.5 pl-9 text-sm">
                  <span className="text-ink">
                    {child.name}
                    {parent.isOfficePickupEligible && <span className="ml-2 text-xs text-ink-muted">covered by {parent.name}</span>}
                  </span>
                  <Toggle
                    checked={parent.isOfficePickupEligible || child.isOfficePickupEligible}
                    disabled={!canSetup || parent.isOfficePickupEligible || saving === child.id}
                    onChange={(eligible) => toggle(child, eligible)}
                    label={`Office pickup for ${child.name}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
