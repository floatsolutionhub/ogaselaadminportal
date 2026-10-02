import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, setAccessToken } from "./apiClient";
import * as authService from "../services/auth";
import type { AdminLoginResponse, CurrentUser } from "../types/api";

const STORAGE_KEY = "ogasela-control-portal:session";

// Inactivity logout. The last-activity time lives in localStorage so every open tab shares it:
// working in one tab keeps the others signed in, and reopening the portal after the limit
// doesn't restore the old session.
const ACTIVITY_KEY = "ogasela-control-portal:last-activity";
const LOGOUT_REASON_KEY = "ogasela-control-portal:logout-reason";
const IDLE_LIMIT_MS = (Number(import.meta.env.VITE_AUTO_LOGOUT_MINUTES) || 10) * 60_000;
/** The warning shows for this long before the logout. */
const IDLE_WARNING_MS = 60_000;
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "scroll", "touchstart"] as const;

export const AUTO_LOGOUT_MINUTES = IDLE_LIMIT_MS / 60_000;

function readLastActivity(): number | null {
  try {
    const value = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeLastActivity(time: number | null): void {
  try {
    if (time === null) localStorage.removeItem(ACTIVITY_KEY);
    else localStorage.setItem(ACTIVITY_KEY, String(time));
  } catch {
    // Storage disabled - the in-memory fallback in AuthProvider still times this tab out.
  }
}

/** Read once by LoginPage to explain why the admin is back on the sign-in screen. */
export function takeLogoutReason(): string | null {
  try {
    const reason = sessionStorage.getItem(LOGOUT_REASON_KEY);
    sessionStorage.removeItem(LOGOUT_REASON_KEY);
    return reason;
  } catch {
    return null;
  }
}

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
  /** Seconds until the inactivity logout, while the one-minute warning is showing; null otherwise. */
  idleSecondsLeft: number | null;
  /** Resets the inactivity timer - the warning's "Stay signed in" button. */
  staySignedIn: () => void;
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
  const [idleSecondsLeft, setIdleSecondsLeft] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastWriteRef = useRef(0);

  useEffect(() => {
    const stored = loadStoredSession();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    // Closed the portal while signed in and came back after the limit: start from the login page.
    const lastActivity = readLastActivity();
    if (lastActivity !== null && Date.now() - lastActivity >= IDLE_LIMIT_MS) {
      authService.logout(stored.refreshToken).catch(() => {});
      saveStoredSession(null);
      writeLastActivity(null);
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
    markActivity(true);
  }

  const markActivity = useCallback((force = false) => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (force || now - lastWriteRef.current >= ACTIVITY_WRITE_THROTTLE_MS) {
      lastWriteRef.current = now;
      writeLastActivity(now);
    }
  }, []);

  function logout(reason?: string): void {
    if (reason) {
      try {
        sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
      } catch {
        // Not fatal - the login page just won't explain why.
      }
    }
    setIdleSecondsLeft(null);
    writeLastActivity(null);
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

  // Watch for activity while signed in, and sign out after IDLE_LIMIT_MS without any - in any tab.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    if (!user) return;

    markActivity(true);
    const onActivity = () => markActivity();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const check = () => {
      const shared = readLastActivity();
      const last = Math.max(shared ?? 0, lastActivityRef.current);
      const remaining = IDLE_LIMIT_MS - (Date.now() - last);
      if (remaining <= 0) {
        logoutRef.current(`You were signed out after ${AUTO_LOGOUT_MINUTES} minutes of inactivity.`);
      } else {
        setIdleSecondsLeft(remaining <= IDLE_WARNING_MS ? Math.ceil(remaining / 1000) : null);
      }
    };
    const interval = window.setInterval(check, 1000);
    // Timers are throttled in background tabs - check again as soon as the tab is visible.
    document.addEventListener("visibilitychange", check);

    // Signed out in another tab: follow it here too.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue === null) {
        setAccessToken(null);
        setUser(null);
        setRefreshToken(null);
        setIdleSecondsLeft(null);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("storage", onStorage);
    };
  }, [user, markActivity]);

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
      value={{
        user,
        isLoading,
        requestLoginOtp,
        verifyLoginOtp,
        logout: () => logout(),
        idleSecondsLeft,
        staySignedIn: () => markActivity(true),
        refreshUser,
        isSuperAdmin,
        hasPermission,
      }}
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
