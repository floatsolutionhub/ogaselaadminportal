import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Lock, Mail } from "lucide-react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { Logo } from "../components/Logo";
import { ErrorBanner } from "../components/ErrorBanner";
import { Spinner } from "../components/Spinner";

type Step = { name: "credentials" } | { name: "otp"; maskedEmail: string; maskedPhone: string };

export function LoginPage() {
  const { user, isLoading, requestLoginOtp, verifyLoginOtp } = useAuth();

  const [step, setStep] = useState<Step>({ name: "credentials" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleCredentialsSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { maskedEmail, maskedPhone } = await requestLoginOtp(email.trim(), password);
      setStep({ name: "otp", maskedEmail, maskedPhone });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await verifyLoginOtp(email.trim(), code.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function backToCredentials() {
    setStep({ name: "credentials" });
    setCode("");
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.08),0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="h-1 bg-brand-500" />

          {step.name === "credentials" ? (
            <div className="p-8">
              <h1 className="text-xl font-bold text-ink">Bira Control Portal</h1>
              <p className="mt-1 text-sm text-ink-muted">Sign in with your admin account to continue.</p>

              <form className="mt-6 space-y-4" onSubmit={handleCredentialsSubmit}>
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
                      className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      id="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-[0_2px_4px_rgba(11,110,79,0.24)] transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Spinner size={16} /> : "Continue"}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-8">
              <h1 className="text-xl font-bold text-ink">Enter your code</h1>
              <p className="mt-1 text-sm text-ink-muted">
                We sent a 6-digit code to <span className="font-medium text-ink">{step.maskedEmail}</span> and{" "}
                <span className="font-medium text-ink">{step.maskedPhone}</span>. It expires in 5 minutes.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleOtpSubmit}>
                <div>
                  <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-ink">
                    Verification code
                  </label>
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
                      className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-center text-lg font-semibold tracking-[0.3em] text-ink outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  disabled={isSubmitting || code.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-[0_2px_4px_rgba(11,110,79,0.24)] transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Spinner size={16} /> : "Verify and sign in"}
                </button>

                <button
                  type="button"
                  onClick={backToCredentials}
                  className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Moderator, Finance Admin, and Super Admin accounts only.
        </p>
      </div>
    </div>
  );
}
