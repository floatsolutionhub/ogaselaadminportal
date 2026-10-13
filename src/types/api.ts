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

export interface SuperAdmin {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
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

// Ogasela.Application/Promotions/GetCategories/CategoryResponse.cs - flat list; a subcategory has parentCategoryId set.
export interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  isFreeEligible: boolean;
  attributeSchemaVersion: number;
  imageUrl: string | null;
}

// Ogasela.Application/Moderation/ListingReview/GetPendingListingsQuery.cs - an ad waiting for approval.
export interface PendingListing {
  id: string;
  title: string;
  description: string;
  /** Naira (not kobo), as the seller entered it. */
  price: number | null;
  condition: string;
  mediaUrls: string[];
  location: string | null;
  categoryName: string | null;
  promotionPlanName: string | null;
  sellerProfileId: string;
  sellerBusinessName: string;
  sellerVerificationStatus: string;
  /** Highest open fraud-risk score (0-1) raised for this ad, if any. */
  fraudScore: number | null;
  submittedAt: string;
}

// Ogasela.Application/Marketing/Announcements/AnnouncementResponse.cs - the app's home-screen pop-up.
export interface Announcement {
  id: string;
  title: string;
  caption: string;
  /** Short-lived signed URL to the image. */
  image: string;
  cta: { label: string; url: string } | null;
  isActive: boolean;
  createdAt: string;
}

// Ogasela.Application/Admin/Users - app users (Buyers/Sellers) for the Users page.
export type AppUserRole = "Buyer" | "Seller";
export type AppUserStatusFilter = "All" | "Active" | "Suspended";

export interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: AppUserRole;
  businessName: string | null;
  verificationStatus: string | null;
  liveAdCount: number;
  isSuspended: boolean;
  createdAt: string;
}

export interface AdminUserPage {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export type UserDocumentStatus = "PendingReview" | "Approved" | "Rejected";

export interface AdminUserDocument {
  id: string;
  type: "IdCard" | "UtilityBill" | "BusinessRegistration" | "OfficeUtilityBill";
  idType: "NationalIdCard" | "NinSlip" | "VotersCard" | "DriversLicence" | "InternationalPassport" | null;
  idNumber: string | null;
  fileName: string;
  contentType: string;
  /** Short-lived signed URL. */
  fileUrl: string;
  status: UserDocumentStatus;
  reviewNote: string | null;
  createdAt: string;
}

export interface AdminUserDetail {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: AppUserRole;
  profilePhotoUrl: string | null;
  createdAt: string;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
  socialLogins: string[];
  seller: {
    sellerProfileId: string;
    businessName: string;
    storeAddress: string | null;
    verificationStatus: string;
    verifiedAt: string | null;
    /** Null unless staff verified the business. */
    businessVerifiedAt: string | null;
  } | null;
  stats: {
    totalAds: number;
    liveAds: number;
    pendingAds: number;
    reviewCount: number;
    averageRating: number;
    openReportsAgainst: number;
    conversations: number;
    activeSessions: number;
  };
  documents: AdminUserDocument[];
  recentListings: {
    id: string;
    title: string;
    price: number | null;
    status: string;
    thumbnailUrl: string | null;
    createdAt: string;
  }[];
}

// Ogasela.Application/Admin/Listings - the All Ads page.
export type ListingStatus = "Draft" | "PendingReview" | "Active" | "ExpiringSoon" | "Expired" | "Paused" | "Sold";
/** Plan names are free text - SuperAdmins add and rename plans in Settings → Pricing. */
export type PlanName = string;

export interface AdminListingListItem {
  id: string;
  title: string;
  /** Naira. */
  price: number | null;
  status: ListingStatus;
  thumbnailUrl: string | null;
  categoryName: string | null;
  planName: PlanName | null;
  sellerUserId: string;
  sellerBusinessName: string;
  location: string | null;
  openReports: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface AdminListingPage {
  items: AdminListingListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminListingDetail {
  id: string;
  title: string;
  description: string;
  price: number | null;
  condition: "New" | "Used";
  status: ListingStatus;
  mediaUrls: string[];
  location: string | null;
  categoryId: string;
  categoryName: string | null;
  parentCategoryName: string | null;
  planName: PlanName | null;
  /** Rejection or takedown reason shown to the seller. */
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  expiresAt: string | null;
  seller: {
    userId: string;
    sellerProfileId: string;
    businessName: string;
    name: string | null;
    phone: string | null;
    verificationStatus: string;
    isSuspended: boolean;
  };
  stats: { impressions: number; views: number; callClicks: number; messageStarts: number; saves: number };
  reports: { id: string; reason: string; status: string; fraudScore: number | null; systemGenerated: boolean; createdAt: string }[];
  campaigns: { platform: string; status: string; impressions: number; clicks: number; spendKobo: number }[];
  history: { action: string; at: string; details: string | null }[];
}

// ---- Disputes & Resolutions (AdminDisputesController) ----

export type DisputeReason = "ItemNotAsDescribed" | "NotDelivered" | "PaidNoResponse" | "FakeOrCounterfeit" | "BuyerDidNotPay" | "Other";
export type DisputeStatus = "Open" | "InReview" | "Resolved";
export type DisputeOutcome = "InFavourOfRaiser" | "InFavourOfRespondent" | "MutualAgreement" | "Dismissed";
export type DisputeAuthorRole = "Raiser" | "Respondent" | "Staff";

export interface AdminDisputeListItem {
  id: string;
  reference: string;
  listingTitle: string;
  raisedByName: string;
  againstName: string;
  reason: DisputeReason;
  status: DisputeStatus;
  assignedToName: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDisputePage {
  items: AdminDisputeListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminDisputeParty {
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  isSeller: boolean;
  isSuspended: boolean;
  businessName: string | null;
}

export interface DisputeEvidence {
  url: string;
  isPdf: boolean;
}

export interface AdminDisputeThreadMessage {
  id: string;
  authorRole: DisputeAuthorRole;
  authorName: string;
  body: string;
  attachment: DisputeEvidence | null;
  createdAt: string;
}

export interface AdminDisputeChatMessage {
  role: "Buyer" | "Seller";
  content: string;
  imageUrl: string | null;
  sentAt: string;
}

export interface AdminDisputeDetail {
  id: string;
  reference: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  outcome: DisputeOutcome | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  assignedToUserId: string | null;
  assignedToName: string | null;
  raisedBy: AdminDisputeParty;
  against: AdminDisputeParty;
  listing: { id: string; title: string; price: number | null; status: ListingStatus; thumbnailUrl: string | null };
  evidence: DisputeEvidence[];
  messages: AdminDisputeThreadMessage[];
  chat: AdminDisputeChatMessage[];
}

// ---- Revenue (AdminRevenueController) - every amount is in kobo ----

export type TransactionType = "PlanPurchase" | "AdSpendTopUp" | "Refund";
export type TransactionStatus = "Pending" | "Success" | "Failed" | "Refunded";

export interface RevenueSummary {
  from: string;
  to: string;
  bucket: "day" | "month";
  revenueKobo: number;
  planPurchases: number;
  previousRevenueKobo: number;
  topUpsKobo: number;
  topUps: number;
  pendingTopUps: number;
  failedTopUps: number;
  refundsKobo: number;
  refunds: number;
  payingSellers: number;
  walletBalancesKobo: number;
  allTimeRevenueKobo: number;
  series: { date: string; revenueKobo: number; topUpsKobo: number }[];
  byPlan: { planName: string; revenueKobo: number; count: number }[];
  topSellers: { userId: string; businessName: string; revenueKobo: number; count: number }[];
}

export interface RevenueTransaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amountKobo: number;
  gatewayReference: string | null;
  sellerUserId: string;
  businessName: string;
  listingId: string | null;
  listingTitle: string | null;
  planName: string | null;
  createdAt: string;
}

export interface RevenueTransactionPage {
  items: RevenueTransaction[];
  page: number;
  pageSize: number;
  totalCount: number;
}

// ---- Settings (PromotionPlansController, AdminSettingsController) ----

export type AiToolTier = "Basic" | "Standard" | "Full";

export interface PromotionPlan {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  durationDays: number;
  photoLimit: number;
  videoAllowed: boolean;
  /** 0-10 - how strongly the plan lifts ads in search and Hot Picks. */
  boostWeight: number;
  /** Kobo. */
  price: number;
  aiToolTier: AiToolTier;
  adPlatformPushAllowed: boolean;
  bundledAdCreditKobo: number;
  isActive: boolean;
}

export type PromotionPlanInput = Omit<PromotionPlan, "id">;

export type NotificationChannel = "Push" | "Sms" | "Email" | "WhatsApp";

export interface PlatformSettings {
  requireListingApproval: boolean;
  freePlanCap: number;
  notifications: {
    category: string;
    label: string;
    description: string;
    channels: { channel: NotificationChannel; enabled: boolean }[];
  }[];
  updatedAt: string | null;
  /** Caption shown above the message box in every chat. */
  messagingSafetyNotice: string;
}

export interface UpdatePlatformSettings {
  requireListingApproval?: boolean;
  freePlanCap?: number;
  messagingSafetyNotice?: string;
  notifications?: { category: string; channel: NotificationChannel; enabled: boolean }[];
}

// Change requests - Ogasela.Api/Controllers/Admin/AdminProfileChangesController.cs

export type ProfileChangeType = "Phone" | "Email" | "BusinessInfo";
export type ProfileChangeStatus = "PendingReview" | "Approved" | "Rejected" | "Cancelled";

/** current* fields are the user's details today, for an old-vs-new comparison. */
export interface AdminProfileChange {
  id: string;
  userId: string;
  userName: string | null;
  userRole: AppUserRole;
  type: ProfileChangeType;
  currentPhone: string | null;
  currentEmail: string | null;
  currentBusinessName: string | null;
  currentStoreAddress: string | null;
  /** The new phone or email; null for business info. */
  newValue: string | null;
  businessName: string | null;
  storeAddress: string | null;
  status: ProfileChangeStatus;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminProfileChangePage {
  items: AdminProfileChange[];
  page: number;
  pageSize: number;
  totalCount: number;
}
