// Ogasela.Api/Controllers/Admin/AdminListingsController.cs - the All Ads page.
import { api } from "../lib/apiClient";
import type { AdminListingDetail, AdminListingPage, ListingStatus, PlanName } from "../types/api";

export function getAdminListings(params: {
  search?: string;
  status?: ListingStatus;
  categoryId?: string;
  plan?: PlanName;
  reported?: boolean;
  page: number;
  pageSize: number;
}): Promise<AdminListingPage> {
  const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.plan) query.set("plan", params.plan);
  if (params.reported) query.set("reported", "true");
  return api.get<AdminListingPage>(`/admin/listings?${query.toString()}`);
}

export function getAdminListing(id: string): Promise<AdminListingDetail> {
  return api.get<AdminListingDetail>(`/admin/listings/${id}`);
}

/** Takes a live ad off public view; the seller is notified with the reason. */
export function takeDownListing(id: string, reason: string): Promise<void> {
  return api.post<void>(`/admin/listings/${id}/take-down`, { reason });
}

export function reinstateListing(id: string): Promise<void> {
  return api.post<void>(`/admin/listings/${id}/reinstate`);
}

export function changeListingCategory(id: string, categoryId: string): Promise<void> {
  return api.put<void>(`/admin/listings/${id}/category`, { categoryId });
}
