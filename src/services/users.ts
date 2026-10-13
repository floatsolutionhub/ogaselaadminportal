// Ogasela.Api/Controllers/Admin/AdminUsersController.cs - app users (Buyers/Sellers).
import { api } from "../lib/apiClient";
import type { AdminUserDetail, AdminUserPage, AppUserRole, AppUserStatusFilter } from "../types/api";

export function getUsers(params: {
  search?: string;
  role?: AppUserRole;
  status: AppUserStatusFilter;
  page: number;
  pageSize: number;
}): Promise<AdminUserPage> {
  const query = new URLSearchParams({ status: params.status, page: String(params.page), pageSize: String(params.pageSize) });
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  return api.get<AdminUserPage>(`/admin/users?${query.toString()}`);
}

export function getUser(id: string): Promise<AdminUserDetail> {
  return api.get<AdminUserDetail>(`/admin/users/${id}`);
}

/** Blocks sign-in, ends sessions and pauses their live ads. */
export function suspendUser(id: string, reason: string): Promise<void> {
  return api.post<void>(`/admin/users/${id}/suspend`, { reason });
}

export function reactivateUser(id: string): Promise<void> {
  return api.post<void>(`/admin/users/${id}/reactivate`);
}

export function revokeUserSessions(id: string): Promise<void> {
  return api.post<void>(`/admin/users/${id}/revoke-sessions`);
}

export function reviewUserDocument(userId: string, documentId: string, approve: boolean, reason?: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/documents/${documentId}/review`, { approve, reason: reason ?? null });
}

/**
 * Verify a person by hand (needs a face photo, an approved ID card and an approved utility bill), or revoke it with a
 * reason they see. Verifying a buyer turns them into a seller.
 */
export function setSellerVerification(userId: string, verified: boolean, reason?: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/verification`, { verified, reason: reason ?? null });
}

/**
 * Verify a seller's business (person verified + approved registration and proof of office address) - a trust badge
 * on their shop and ads - or revoke it with a reason they see.
 */
export function setBusinessVerification(userId: string, verified: boolean, reason?: string): Promise<void> {
  return api.post<void>(`/admin/users/${userId}/business-verification`, { verified, reason: reason ?? null });
}
