import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, setAccessToken } from "./apiClient";
import * as authService from "../services/auth";
import type { AdminLoginResponse, CurrentUser } from "../types/api";

const STORAGE_KEY = "ogasela-control-portal:session";

// Only these roles have any route on AdminController/StaffController/RbacController - everyone
// else (Buyer/Seller/SupportAgent) has no business in this portal. The backend already enforces
// this independently (the plain /auth/login endpoint these roles would otherwise use rejects
// them with User.MfaRequired, and every actual route is gated by [Authorize]) - this is a
// second, UX-only check so a non-admin account never even reaches step 2 of the OTP flow. "Staff"
// covers every account onboarded through the new RBAC system - what they can actually do from
// there is driven by their staffProfile.permissions/roleType, not this coarse role check.
const ALLOWED_ROLES = new Set(["Moderator", "FinanceAdmin", "SuperAdmin", "Staff"]);

interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  /** Step 1: email + password. Returns masked email/phone the OTP was sent to. Throws ApiError on invalid credentials or a non-admin account. */
  requestLoginOtp: (email: string, password: string) => Promise<AdminLoginResponse>;
  /** Step 2: the OTP code. Completes sign-in on success. */
  verifyLoginOtp: (email: string, code: string) => Promise<void>;
  logout: () => void;
  /** Re-fetches /me - used after ChangePasswordPage clears mustChangePassword, so the redirect-loop guard sees the update without a full reload. */
  refreshUser: () => Promise<void>;
  /** SuperAdmin either flavour (legacy UserRole.SuperAdmin, or a Staff account whose dynamic Role has RoleType SuperAdmin) - mirrors the backend's PermissionAuthorizationHandler bypass rule. */
  isSuperAdmin: boolean;
  /** True if the current user can perform the given permission key, or is a SuperAdmin (who can do anything). Non-staff internal roles (Moderator/FinanceAdmin) have no permission claims and can't use any perm-gated route. */
  hasPermission: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredSession | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private-browsing/storage-disabled: the session just won't survive a reload. Not fatal.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredSession();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    setAccessToken(stored.accessToken);
    authService
      .getCurrentUser()
      .then((me) => {
        if (!ALLOWED_ROLES.has(me.role)) {
          throw new ApiError(403, "This account does not have admin portal access.");
        }
        setUser(me);
        setRefreshToken(stored.refreshToken);
      })
      .catch(() => {
        setAccessToken(null);
        saveStoredSession(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function requestLoginOtp(email: string, password: string): Promise<AdminLoginResponse> {
    // Any failure here (bad credentials, non-admin account, no phone on file) surfaces the
    // backend's own message as-is - it already avoids distinguishing "wrong password" from
    // "not an admin account".
    return authService.adminLogin(email, password);
  }

  async function verifyLoginOtp(email: string, code: string): Promise<void> {
    const tokens = await authService.verifyAdminLoginOtp(email, code);
    setAccessToken(tokens.accessToken);

    let me: CurrentUser;
    try {
      me = await authService.getCurrentUser();
    } catch (error) {
      setAccessToken(null);
      throw error;
    }

    if (!ALLOWED_ROLES.has(me.role)) {
      setAccessToken(null);
      throw new ApiError(403, "This account does not have admin portal access.");
    }

    setUser(me);
    setRefreshToken(tokens.refreshToken);
    saveStoredSession({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  }

  function logout(): void {
    if (refreshToken) {
      authService.logout(refreshToken).catch(() => {
        // Best-effort - the access token still expires on its own shortly either way.
      });
    }

    setAccessToken(null);
    setUser(null);
    setRefreshToken(null);
    saveStoredSession(null);
  }

  async function refreshUser(): Promise<void> {
    const me = await authService.getCurrentUser();
    setUser(me);
  }

  const isSuperAdmin = user?.role === "SuperAdmin" || user?.staffProfile?.roleType === "SuperAdmin";

  function hasPermission(permissionKey: string): boolean {
    if (isSuperAdmin) return true;
    return user?.staffProfile?.permissions.includes(permissionKey) ?? false;
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, requestLoginOtp, verifyLoginOtp, logout, refreshUser, isSuperAdmin, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
