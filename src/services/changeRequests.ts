// Ogasela.Api/Controllers/Admin/AdminProfileChangesController.cs - phone/email/business-info changes awaiting approval.
import { api } from "../lib/apiClient";
import type { AdminProfileChangePage, ProfileChangeStatus } from "../types/api";

/** Newest first. Omit status for every request. */
export function getChangeRequests(params: {
  status?: ProfileChangeStatus;
  page: number;
  pageSize: number;
}): Promise<AdminProfileChangePage> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.status) query.set("status", params.status);
  return api.get<AdminProfileChangePage>(`/admin/change-requests?${query.toString()}`);
}

/** Approving applies the change; rejecting needs a reason the user sees. Either way the user is notified. */
export function reviewChangeRequest(id: string, approve: boolean, reason?: string): Promise<void> {
  return api.post<void>(`/admin/change-requests/${id}/review`, { approve, reason: reason ?? null });
}
