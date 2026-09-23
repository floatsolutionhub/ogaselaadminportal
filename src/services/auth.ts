// Ogasela.Api/Controllers/Accounts/AuthController.cs + MeController.cs - only the calls this
// portal actually makes. The plain /auth/login endpoint always rejects internal roles with
// User.MfaRequired, so sign-in here is exclusively the two-step admin/login -> admin/login/verify
// flow (email+password, then the OTP it sends to both email and phone).
import { api } from "../lib/apiClient";
import type { AdminLoginResponse, AuthTokenResponse, CurrentUser } from "../types/api";

export function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  return api.post<AdminLoginResponse>("/auth/admin/login", { email, password });
}

export function verifyAdminLoginOtp(email: string, code: string): Promise<AuthTokenResponse> {
  return api.post<AuthTokenResponse>("/auth/admin/login/verify", { email, code });
}

export function logout(refreshToken: string): Promise<void> {
  return api.post<void>("/auth/logout", { refreshToken });
}

export function getCurrentUser(): Promise<CurrentUser> {
  return api.get<CurrentUser>("/me");
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return api.post<void>("/auth/change-password", { currentPassword, newPassword });
}
