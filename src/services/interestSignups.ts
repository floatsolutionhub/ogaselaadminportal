// Ogasela.Api/Controllers/Admin/AdminInterestSignupsController.cs - waiting-list and tester signups from ogasela.com.
import { api } from "../lib/apiClient";
import type {
  AdminInterestSignupPage,
  InterestDevicePlatform,
  InterestKind,
  InterestSignupStatus,
  InterestSignupSummary,
} from "../types/api";

export interface InterestSignupFilters {
  kind?: InterestKind;
  status?: InterestSignupStatus;
  search?: string;
  devicePlatform?: InterestDevicePlatform;
}

function toQuery(filters: InterestSignupFilters): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.kind) query.set("kind", filters.kind);
  if (filters.status) query.set("status", filters.status);
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.devicePlatform) query.set("devicePlatform", filters.devicePlatform);
  return query;
}

/** Newest first. */
export function getInterestSignups(
  params: InterestSignupFilters & { page: number; pageSize: number },
): Promise<AdminInterestSignupPage> {
  const query = toQuery(params);
  query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize));
  return api.get<AdminInterestSignupPage>(`/admin/interest-signups?${query.toString()}`);
}

export function getInterestSignupSummary(): Promise<InterestSignupSummary> {
  return api.get<InterestSignupSummary>("/admin/interest-signups/summary");
}

/** Only the fields sent are changed. Notes "" clears them. */
export function updateInterestSignup(id: string, changes: { status?: InterestSignupStatus; notes?: string }): Promise<void> {
  return api.patch<void>(`/admin/interest-signups/${id}`, changes);
}

/** Permanent - for when the person asks to be removed. */
export function deleteInterestSignup(id: string): Promise<void> {
  return api.del<void>(`/admin/interest-signups/${id}`);
}

/** Every row matching the filters as CSV. Audited server-side. */
export function exportInterestSignups(filters: InterestSignupFilters): Promise<void> {
  return api.download(`/admin/interest-signups/export?${toQuery(filters).toString()}`, "ogasela-signups.csv");
}
