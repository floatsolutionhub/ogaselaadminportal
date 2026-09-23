import { useState, type FormEvent } from "react";
import { KeyRound, Lock } from "lucide-react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { changePassword } from "../services/auth";
import { AuthShell } from "../components/AuthShell";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { Spinner } from "../components/Spinner";

export function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change your password. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <Card className="shadow-[0_20px_50px_-12px_rgba(6,61,44,0.25)]">
        <div className="flex items-center gap-2 text-brand-600">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
            <KeyRound size={17} />
          </span>
          <h1 className="text-lg font-bold text-ink">Set a new password</h1>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {user?.mustChangePassword
            ? "Your account was just created with a temporary password. Set a new one to continue."
            : "Change your Ogasela Control Portal password."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-ink">
              {user?.mustChangePassword ? "Temporary password" : "Current password"}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                id="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-black/[0.015] py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-ink">
              New password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-black/[0.015] py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink">
              Confirm new password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-black/[0.015] py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(11,110,79,0.35)] transition-all hover:shadow-[0_6px_18px_rgba(11,110,79,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Spinner size={16} /> : "Save new password"}
          </button>
        </form>
      </Card>
    </AuthShell>
  );
}
