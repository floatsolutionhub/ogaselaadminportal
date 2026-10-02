import { Clock } from "lucide-react";
import { useAuth } from "../lib/auth";

/** Shown for the last minute before the inactivity logout. Any mouse or keyboard activity also dismisses it. */
export function IdleLogoutWarning() {
  const { idleSecondsLeft, staySignedIn, logout } = useAuth();
  if (idleSecondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" role="alertdialog" aria-labelledby="idle-title">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Clock size={22} />
        </span>
        <h2 id="idle-title" className="mt-3 text-base font-semibold text-ink">
          Still there?
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          You'll be signed out in <span className="font-semibold tabular-nums text-ink">{idleSecondsLeft}s</span> because you've been
          inactive.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={staySignedIn}
            autoFocus
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
