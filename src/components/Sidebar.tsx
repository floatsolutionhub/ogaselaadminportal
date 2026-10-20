import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { useVisibleNavItems } from "../lib/nav";
import { usePendingActions } from "../lib/pendingActions";

export function Sidebar() {
  const visibleItems = useVisibleNavItems();
  const { countFor } = usePendingActions();

  return (
    <aside className="relative flex h-screen w-64 flex-shrink-0 flex-col overflow-hidden bg-linear-to-b from-brand-900 via-brand-800 to-brand-800 text-brand-50">
      <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 opacity-[0.06]" />

      <div className="relative z-10 flex h-16 flex-shrink-0 items-center border-b border-white/10 px-6">
        <Logo dark />
      </div>

      <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-brand-100/80 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-300 transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon size={18} strokeWidth={2} className={isActive ? "text-brand-300" : "text-brand-200/70 group-hover:text-brand-200"} />
                <span className="flex-1">{label}</span>
                {countFor(to) > 0 && (
                  <span
                    aria-label={`${countFor(to)} pending`}
                    className="min-w-[20px] rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-white"
                  >
                    {countFor(to) > 99 ? "99+" : countFor(to)}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="relative z-10 border-t border-white/10 px-6 py-4">
        <p className="text-xs font-medium text-brand-100/90">Ogasela Control Portal</p>
        <p className="text-[11px] text-brand-300/60">Internal use only</p>
      </div>
    </aside>
  );
}
