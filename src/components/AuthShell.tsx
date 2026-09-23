import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

/**
 * Shared split-screen frame for every pre-app gate (login, forced password change): a dark
 * brand panel on the left, the actual form on the right. Keeps one visual identity across both
 * screens instead of each reimplementing its own background.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-brand-900">
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-linear-to-br from-brand-900 via-brand-800 to-brand-600 px-12 py-10 lg:flex">
        <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 opacity-[0.15]" />
        <div aria-hidden className="pointer-events-none absolute -top-32 -left-20 h-96 w-96 rounded-full bg-brand-300/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-brand-900/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/10" />

        <div className="relative z-10">
          <Logo dark size="lg" />
        </div>

        <div className="relative z-10 max-w-sm space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-50 ring-1 ring-white/15 backdrop-blur">
            <ShieldCheck size={13} /> Internal use only
          </span>
          <h2 className="text-3xl font-bold leading-tight text-white">Every decision on Ogasela, verified and logged.</h2>
          <p className="text-sm leading-relaxed text-brand-100/80">
            Moderation, seller verification, staff and access control - one control center for the team keeping the
            marketplace safe.
          </p>
        </div>

        <p className="relative z-10 text-xs text-brand-200/60">&copy; {new Date().getFullYear()} Ogasela. Ogasela Control Portal.</p>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-surface px-4 py-12">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm animate-fade-in-up">{children}</div>
      </div>
    </div>
  );
}
