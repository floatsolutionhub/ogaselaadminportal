import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Search, UserRound } from "lucide-react";
import { getUsers } from "../services/users";
import { useApiQuery } from "../lib/useApiQuery";
import { formatDateTime } from "../lib/format";
import type { AppUserRole, AppUserStatusFilter } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 25;

export function UsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AppUserRole | "">("");
  const [status, setStatus] = useState<AppUserStatusFilter>("All");
  const [page, setPage] = useState(1);

  // Search as the admin types, without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error } = useApiQuery(
    () => getUsers({ search: search || undefined, role: role || undefined, status, page, pageSize: PAGE_SIZE }),
    [search, role, status, page],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Users</h2>
        <p className="text-xs text-ink-muted">Everyone who has signed up to the Ogasela app - buyers and sellers. Newest first.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Search</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, email, phone or business"
              className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Role</label>
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as AppUserRole | "");
              setPage(1);
            }}
            placeholder="All roles"
            options={[
              { value: "Seller", label: "Sellers" },
              { value: "Buyer", label: "Buyers" },
            ]}
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <Select
            value={status === "All" ? "" : status}
            onChange={(e) => {
              setStatus((e.target.value || "All") as AppUserStatusFilter);
              setPage(1);
            }}
            placeholder="All statuses"
            options={[
              { value: "Active", label: "Active" },
              { value: "Suspended", label: "Suspended" },
            ]}
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={search || role || status !== "All" ? "No users match" : "No users yet"}
          description={search || role || status !== "All" ? "Try a different search or filter." : "App sign-ups will appear here."}
        />
      ) : (
        <>
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Business</th>
                  <th className="px-5 py-3 text-right">Live ads</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]">
                    <td className="px-5 py-3">
                      <Link to={`/users/${user.id}`} className="font-medium text-ink hover:text-brand-600">
                        {user.name ?? "Unnamed user"}
                      </Link>
                      <p className="text-xs text-ink-muted">{user.email ?? user.phone ?? ""}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={user.role === "Seller" ? "brand" : "neutral"}>{user.role}</Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {user.businessName ? (
                        <span className="inline-flex items-center gap-1">
                          {user.businessName}
                          {user.verificationStatus === "Verified" && <BadgeCheck size={14} className="text-brand-600" />}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-muted">{user.liveAdCount}</td>
                    <td className="px-5 py-3">
                      {user.isSuspended ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{formatDateTime(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination page={page} totalPages={totalPages} totalCount={data.totalCount} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
