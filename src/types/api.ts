// Mirrors Ogasela.API's response/request DTOs exactly (property names, casing) so the two stay
// visibly in sync. See Ogasela.Api/Controllers/Admin/AdminController.cs and
// Ogasela.Api/Controllers/Verification/VerificationController.cs for the routes these back.

export type UserRole = "Buyer" | "Seller" | "SupportAgent" | "Moderator" | "FinanceAdmin" | "SuperAdmin" | "Staff";

export type RoleType = "SuperAdmin" | "Admin" | "HR" | "Standard";

export type StaffOnboardingStatus = "PendingApproval" | "Approved" | "Rejected";

/** Attached to CurrentUser only when role === "Staff". Mirrors Ogasela.Api's CurrentUserResponse.StaffProfile. */
export interface CurrentUserStaffProfile {
  id: string;
  departmentName: string;
  unitName: string;
  roleName: string;
  roleType: RoleType;
  permissions: string[];
  status: StaffOnboardingStatus;
}

export interface CurrentUser {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  createdAt: string;
  mustChangePassword: boolean;
  staffProfile: CurrentUserStaffProfile | null;
}

export interface AuthTokenResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/** Step 1 (email+password) succeeded - an OTP has been sent to these (masked) destinations. */
export interface AdminLoginResponse {
  maskedEmail: string;
  maskedPhone: string;
}

export type ModerationQueueItemType = "Report" | "BiometricManualReview";

export interface ModerationQueueItem {
  id: string;
  type: ModerationQueueItemType;
  targetId: string;
  summary: string;
  priorityScore: number;
  createdAt: string;
}

export type ReportDecision = "Approve" | "Remove" | "Escalate";

export interface ManualReviewQueueItem {
  verificationId: string;
  sellerId: string;
  attemptNumber: number;
  livenessScore: number | null;
  idMatchScore: number | null;
  createdAt: string;
}

export type VerificationDecision = "Verified" | "Failed" | "ManualReview";

export interface PlanRevenue {
  plan: string;
  revenueKobo: number;
  purchaseCount: number;
}

export interface VerificationFunnel {
  notStarted: number;
  pending: number;
  manualReview: number;
  verified: number;
  failed: number;
  verifiedRate: number;
  failedRate: number;
}

export interface PlatformDashboard {
  activeUsersLast24h: number;
  activeUsersLast30d: number;
  listingsCreatedLast24h: number;
  listingsCreatedLast30d: number;
  revenueByPlan: PlanRevenue[];
  verificationFunnel: VerificationFunnel;
  adBoostAdoptionRate: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeJson: string | null;
  afterJson: string | null;
  timestamp: string;
}

export interface PagedAuditLog {
  items: AuditLogEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface EraseUserDataReceipt {
  userId: string;
  biometricVerificationsErased: number;
  adAccountConnectionsRevoked: number;
  refreshTokensRevoked: number;
  sellerProfileAnonymized: boolean;
  erasedAt: string;
}

export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

// Rbac: departments/units/roles/permissions - Ogasela.Api/Controllers/Rbac/RbacController.cs

export interface Department {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface OrgUnit {
  id: string;
  departmentId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Permission {
  id: string;
  key: string;
  category: string;
  label: string;
}

export interface Role {
  id: string;
  name: string;
  roleType: RoleType;
  permissionKeys: string[];
  createdAt: string;
}

// Staff onboarding - Ogasela.Api/Controllers/Staff/StaffController.cs

export type StaffKycDocumentType = "GovernmentId" | "ProofOfAddress" | "PassportPhoto";

export interface StaffKycDocument {
  id: string;
  documentType: StaffKycDocumentType;
  originalFileName: string;
  uploadedAt: string;
}

export interface StaffListItem {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  departmentName: string;
  unitName: string;
  roleName: string;
  status: StaffOnboardingStatus;
  createdAt: string;
}

export interface StaffDetail extends StaffListItem {
  rejectionReason: string | null;
  decidedAt: string | null;
  documents: StaffKycDocument[];
}

// Nigeria geo reference data - Ogasela.Api/Controllers/Geo/GeoController.cs

export interface NigeriaState {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface NigeriaCity {
  id: string;
  stateId: string;
  name: string;
  createdAt: string;
}
