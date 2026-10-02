// Ogasela.Api/Controllers/Admin/AdminController.cs - one function per route, in the same order
// they're declared there.
import { api } from "../lib/apiClient";
import type {
  EraseUserDataReceipt,
  ModerationQueueItem,
  ManualReviewQueueItem,
  PagedAuditLog,
  PendingListing,
  PlatformDashboard,
  ReportDecision,
} from "../types/api";

export function getModerationQueue(): Promise<ModerationQueueItem[]> {
  return api.get<ModerationQueueItem[]>("/admin/moderation/queue");
}

export function resolveReport(reportId: string, decision: ReportDecision, notes?: string): Promise<void> {
  return api.post<void>(`/admin/moderation/${reportId}/decision`, { decision, notes });
}

export function getPendingListings(): Promise<PendingListing[]> {
  return api.get<PendingListing[]>("/admin/listings/pending");
}

export function approveListing(listingId: string): Promise<void> {
  return api.post<void>(`/admin/listings/${listingId}/approve`);
}

/** Back to Draft with the reason shown to the seller; a paid plan charge is refunded to their wallet. */
export function rejectListing(listingId: string, reason: string): Promise<void> {
  return api.post<void>(`/admin/listings/${listingId}/reject`, { reason });
}

export function getManualReviewQueue(): Promise<ManualReviewQueueItem[]> {
  return api.get<ManualReviewQueueItem[]>("/admin/verification/manual-review-queue");
}

export function getDashboard(): Promise<PlatformDashboard> {
  return api.get<PlatformDashboard>("/admin/dashboard");
}

export function eraseUserData(userId: string): Promise<EraseUserDataReceipt> {
  return api.post<EraseUserDataReceipt>(`/admin/data-requests/${userId}/erase`);
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function getAuditLog(filters: AuditLogFilters): Promise<PagedAuditLog> {
  const params = new URLSearchParams();
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));

  return api.get<PagedAuditLog>(`/admin/audit-log?${params.toString()}`);
}
