import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellOff, BellRing, CheckCircle2, ChevronRight } from "lucide-react";
import { usePendingActions } from "../lib/pendingActions";
import { Spinner } from "./Spinner";

/** Top-bar bell: everything waiting on the signed-in staff member, one row per queue, each linking to the work. */
export function NotificationBell() {
  const { items, total, isLoading, desktopAlerts, enableDesktopAlerts, disableDesktopAlerts } = usePendingActions();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={total > 0 ? `${total} pending action${total === 1 ? "" : "s"}` : "No pending actions"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
      >
        {total > 0 ? <BellRing size={18} /> : <Bell size={18} />}
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pending actions"
          className="absolute right-0 top-11 z-40 w-96 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Pending actions</p>
              <p className="text-xs text-ink-muted">Work waiting on you, refreshed every minute.</p>
            </div>
            {total > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{total}</span>}
          </div>

          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 size={28} className="text-emerald-600" />
              <p className="text-sm font-medium text-ink">You're all caught up</p>
              <p className="text-xs text-ink-muted">Nothing is waiting on you right now.</p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-black/5 overflow-y-auto">
              {items.map(({ key, label, to, icon: Icon }) => (
                <li key={key}>
                  <Link
                    to={to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-ink transition-colors hover:bg-brand-50/60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon size={16} />
                    </span>
                    <span className="flex-1 font-medium">{label}</span>
                    <ChevronRight size={16} className="text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-black/5 bg-black/[0.02] px-4 py-2.5 text-xs text-ink-muted">
            {desktopAlerts === "on" ? (
              <button type="button" onClick={disableDesktopAlerts} className="flex items-center gap-1.5 font-medium hover:text-ink">
                <BellOff size={13} /> Turn off desktop alerts
              </button>
            ) : desktopAlerts === "off" ? (
              <button type="button" onClick={enableDesktopAlerts} className="flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700">
                <BellRing size={13} /> Alert me on my desktop when new work arrives
              </button>
            ) : desktopAlerts === "blocked" ? (
              <span>Desktop alerts are blocked for this site in your browser settings.</span>
            ) : (
              <span>This browser doesn't support desktop alerts.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
