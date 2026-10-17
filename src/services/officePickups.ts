// Ogasela.Api/Controllers/Admin/AdminOfficePickupsController.cs - Office Pickup.
import { api } from "../lib/apiClient";
import type {
  AdminOfficeBranch,
  AdminOfficePickupDetail,
  AdminOfficePickupPage,
  OfficePickupCategory,
  OfficePickupStatus,
  SaveOfficeBranchRequest,
} from "../types/api";

export function getOfficePickups(params: {
  status?: OfficePickupStatus;
  branchId?: string;
  cancellationRequested?: boolean;
  includeUnpaid?: boolean;
  search?: string;
  page: number;
  pageSize: number;
}): Promise<AdminOfficePickupPage> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.status) query.set("status", params.status);
  if (params.branchId) query.set("branchId", params.branchId);
  if (params.cancellationRequested) query.set("cancellationRequested", "true");
  if (params.includeUnpaid) query.set("includeUnpaid", "true");
  if (params.search) query.set("search", params.search);
  return api.get<AdminOfficePickupPage>(`/admin/office-pickups?${query.toString()}`);
}

export function getOfficePickup(id: string): Promise<AdminOfficePickupDetail> {
  return api.get<AdminOfficePickupDetail>(`/admin/office-pickups/${id}`);
}

/** Moves the request to its next stage; the buyer (and seller, where relevant) is notified with the note. */
export function updateOfficePickupStatus(
  id: string,
  request: { status: OfficePickupStatus; note: string | null; deliveryAddress: string | null },
): Promise<void> {
  return api.post<void>(`/admin/office-pickups/${id}/status`, request);
}

/** Refunds the buyer the total paid less the 1% cancellation fee. */
export function refundOfficePickup(id: string, reason: string): Promise<void> {
  return api.post<void>(`/admin/office-pickups/${id}/refund`, { reason });
}

export function getOfficeBranches(): Promise<AdminOfficeBranch[]> {
  return api.get<AdminOfficeBranch[]>("/admin/office-pickups/branches");
}

export function saveOfficeBranch(id: string | null, request: SaveOfficeBranchRequest): Promise<AdminOfficeBranch> {
  return id
    ? api.put<AdminOfficeBranch>(`/admin/office-pickups/branches/${id}`, request)
    : api.post<AdminOfficeBranch>("/admin/office-pickups/branches", request);
}

export function getOfficePickupCategories(): Promise<OfficePickupCategory[]> {
  return api.get<OfficePickupCategory[]>("/admin/office-pickups/categories");
}

export function setOfficePickupCategory(id: string, eligible: boolean): Promise<void> {
  return api.put<void>(`/admin/office-pickups/categories/${id}`, { eligible });
}
