import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, UserPlus } from "lucide-react";
import { getStaffList } from "../services/staff";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import type { StaffOnboardingStatus } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Select } from "../components/Select";

const STATUS_TONE: Record<StaffOnboardingStatus, "warning" | "success" | "danger"> = {
  PendingApproval: "warning",
  Approved: "success",
  Rejected: "danger",
};

const STATUS_LABEL: Record<StaffOnboardingStatus, string> = {
  PendingApproval: "Pending approval",
  Approved: "Approved",
  Rejected: "Rejected",
};

export function StaffListPage() {
  const { hasPermission } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StaffOnboardingStatus | "">("");

  const { data, isLoading, error } = useApiQuery(
    () => getStaffList(statusFilter || undefined),
    [statusFilter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Staff</h2>
          <p className="text-xs text-ink-muted">Everyone onboarded through the Control Portal, and their KYC status.</p>
        </div>
        {hasPermission("staff.create") && (
          <Link
            to="/staff/new"
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <UserPlus size={15} /> Onboard staff
          </Link>
        )}
      </div>

      <Card className="flex items-end gap-3">
        <div className="w-56">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StaffOnboardingStatus | "")}
            placeholder="All statuses"
            options={[
              { value: "PendingApproval", label: "Pending approval" },
              { value: "Approved", label: "Approved" },
              { value: "Rejected", label: "Rejected" },
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
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Users} title="No staff yet" description="Onboard your first staff member to get started." />
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Department / Unit</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Onboarded</th>
              </tr>
            </thead>
            <tbody>
              {data.map((staff) => (
                <tr key={staff.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]">
                  <td className="px-5 py-3">
                    <Link to={`/staff/${staff.id}`} className="font-medium text-ink hover:text-brand-600">
                      {staff.name ?? "—"}
                    </Link>
                    <p className="text-xs text-ink-muted">{staff.email ?? staff.phone ?? ""}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">
                    {staff.departmentName} &middot; {staff.unitName}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{staff.roleName}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[staff.status]}>{STATUS_LABEL[staff.status]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{formatDateTime(staff.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
