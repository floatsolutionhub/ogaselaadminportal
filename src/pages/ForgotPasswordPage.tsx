import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { confirmAdminPasswordReset, requestAdminPasswordReset } from "../services/auth";
import { AuthShell } from "../components/AuthShell";
import { ErrorBanner } from "../components/ErrorBanner";
import { PasswordInput } from "../components/PasswordInput";
import { Spinner } from "../components/Spinner";

type Step = "email" | "reset" | "done";

const inputClassName =
  "w-full rounded-xl border border-black/10 bg-black/[0.015] py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100";

const submitClassName =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(11,110,79,0.35)] transition-all hover:shadow-[0_6px_18px_rgba(11,110,79,0.45)] disabled:cursor-not-allowed disabled:opacity-60";

export function ForgotPasswordPage() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const prefilledEmail = (location.state as { email?: string } | null)?.email ?? "";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(prefilledEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function sendCode() {
    setError(null);
    setIsSubmitting(true);
    try {
      await requestAdminPasswordReset(email.trim());
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    if (await sendCode()) {
      setNotice(null);
      setStep("reset");
    }
  }

  async function handleResend() {
    setCode("");
    if (await sendCode()) {
      setNotice("A new code is on its way.");
    }
  }

  async function handleResetSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmAdminPasswordReset(email.trim(), code.trim(), newPassword);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset your password. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function backToEmail() {
    setStep("email");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setNotice(null);
  }

  return (
    <AuthShell>
      <div>
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_20px_50px_-12px_rgba(6,61,44,0.25),0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="h-1.5 bg-linear-to-r from-brand-400 via-brand-500 to-brand-600" />

          {step === "email" && (
            <div className="p-8">
              <h1 className="text-xl font-bold text-ink">Forgot your password?</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Enter your admin email. We'll send a 6-digit reset code to the email and phone number on your account.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleEmailSubmit}>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@ogasela.com"
                      className={inputClassName}
                    />
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button type="submit" disabled={isSubmitting} className={submitClassName}>
                  {isSubmitting ? <Spinner size={16} /> : "Send reset code"}
                </button>

                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </form>
            </div>
          )}

          {step === "reset" && (
            <div className="p-8">
              <h1 className="text-xl font-bold text-ink">Reset your password</h1>
              <p className="mt-1 text-sm text-ink-muted">
                If <span className="font-medium text-ink">{email.trim()}</span> belongs to an admin account, we've sent a
                6-digit code to its email and phone. It expires in 5 minutes.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleResetSubmit}>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="code" className="block text-sm font-medium text-ink">
                      Reset code
                    </label>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isSubmitting}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
                    >
                      Resend code
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className={`${inputClassName} text-center text-lg font-semibold tracking-[0.3em]`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-ink">
                    New password
                  </label>
                  <PasswordInput
                    id="newPassword"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <p className="mt-1 text-xs text-ink-muted">At least 8 characters.</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink">
                    Confirm new password
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                {notice && !error && <p className="text-sm text-brand-700">{notice}</p>}
                {error && <ErrorBanner message={error} />}

                <button type="submit" disabled={isSubmitting || code.length !== 6} className={submitClassName}>
                  {isSubmitting ? <Spinner size={16} /> : "Reset password"}
                </button>

                <button
                  type="button"
                  onClick={backToEmail}
                  className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
                >
                  <ArrowLeft size={14} />
                  Use a different email
                </button>
              </form>
            </div>
          )}

          {step === "done" && (
            <div className="p-8">
              <div className="flex items-center gap-2 text-brand-600">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                  <CheckCircle2 size={17} />
                </span>
                <h1 className="text-xl font-bold text-ink">Password reset</h1>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                Your password has been changed and you've been signed out of every other session. Sign in with your new
                password to continue.
              </p>

              <Link to="/login" className={`${submitClassName} mt-6`}>
                Back to sign in
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Moderator, Finance Admin, and Super Admin accounts only.
        </p>
      </div>
    </AuthShell>
  );
}
