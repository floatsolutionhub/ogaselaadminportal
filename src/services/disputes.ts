// Ogasela.Api/Controllers/Admin/AdminDisputesController.cs - Disputes & Resolutions.
import { api } from "../lib/apiClient";
import type { AdminDisputeDetail, AdminDisputePage, DisputeOutcome, DisputeStatus } from "../types/api";

export function getDisputes(params: {
  status?: DisputeStatus;
  search?: string;
  assignedToMe?: boolean;
  page: number;
  pageSize: number;
}): Promise<AdminDisputePage> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.assignedToMe) query.set("assignedToMe", "true");
  return api.get<AdminDisputePage>(`/admin/disputes?${query.toString()}`);
}

export function getDispute(id: string): Promise<AdminDisputeDetail> {
  return api.get<AdminDisputeDetail>(`/admin/disputes/${id}`);
}

export function assignDisputeToMe(id: string): Promise<void> {
  return api.post<void>(`/admin/disputes/${id}/assign-to-me`);
}

/** Posts on the dispute thread - both parties see it and are notified. */
export function messageDisputeParties(id: string, body: string): Promise<void> {
  return api.post<void>(`/admin/disputes/${id}/messages`, { body });
}

export function resolveDispute(
  id: string,
  request: { outcome: DisputeOutcome; note: string; takeDownListing: boolean; suspendUserId: string | null },
): Promise<void> {
  return api.post<void>(`/admin/disputes/${id}/resolve`, request);
}
