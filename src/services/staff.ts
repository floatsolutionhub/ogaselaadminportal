// Ogasela.Api/Controllers/Staff/StaffController.cs - one function per route, in the same order they're declared there.
import { api } from "../lib/apiClient";
import type { StaffDetail, StaffKycDocument, StaffKycDocumentType, StaffListItem, StaffOnboardingStatus, SuperAdmin } from "../types/api";

export interface CreateStaffInput {
  name: string;
  phone: string | null;
  email: string | null;
  departmentId: string;
  unitId: string;
  roleId: string;
}

export function createStaff(input: CreateStaffInput): Promise<StaffDetail> {
  return api.post<StaffDetail>("/staff", input);
}

export function getStaffList(status?: StaffOnboardingStatus): Promise<StaffListItem[]> {
  const params = status ? `?status=${status}` : "";
  return api.get<StaffListItem[]>(`/staff${params}`);
}

export function getSuperAdmins(): Promise<SuperAdmin[]> {
  return api.get<SuperAdmin[]>("/staff/super-admins");
}

export function getStaffDetail(id: string): Promise<StaffDetail> {
  return api.get<StaffDetail>(`/staff/${id}`);
}

export function uploadStaffKycDocument(
  staffProfileId: string,
  file: File,
  documentType: StaffKycDocumentType,
): Promise<StaffKycDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", documentType);
  return api.postForm<StaffKycDocument>(`/staff/${staffProfileId}/documents`, formData);
}

export function approveStaffOnboarding(staffProfileId: string): Promise<void> {
  return api.post<void>(`/staff/${staffProfileId}/approve`);
}

export function rejectStaffOnboarding(staffProfileId: string, reason: string): Promise<void> {
  return api.post<void>(`/staff/${staffProfileId}/reject`, { reason });
}
