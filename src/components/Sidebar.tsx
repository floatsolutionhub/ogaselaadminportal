import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldAlert,
  FileClock,
  ScrollText,
  UserX,
  Users,
  Building2,
  KeySquare,
  MapPin,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../lib/auth";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Omit for routes every logged-in staff member sees. */
  permission?: string;
  requireSuperAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/moderation", label: "Moderation Queue", icon: ShieldAlert, permission: "moderation.queue.view" },
  { to: "/manual-review", label: "Manual Review", icon: FileClock, permission: "verification.queue.view" },
  { to: "/staff", label: "Staff", icon: Users, permission: "staff.view" },
  { to: "/departments", label: "Departments", icon: Building2, permission: "rbac.department.manage" },
  { to: "/roles", label: "Roles", icon: KeySquare, permission: "rbac.role.manage" },
  { to: "/locations", label: "Locations", icon: MapPin, permission: "geo.state.manage" },
  { to: "/audit-log", label: "Audit Log", icon: ScrollText, permission: "audit.log.view" },
  { to: "/data-erasure", label: "Data Erasure", icon: UserX, permission: "dataprivacy.erase" },
];

export function Sidebar() {
  const { user, isSuperAdmin, hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission && !item.requireSuperAdmin) return true;
    if (item.requireSuperAdmin) return isSuperAdmin;
    // Moderator/FinanceAdmin (the legacy fixed internal roles) have no permission claims at all,
    // since permissions only exist for the new Staff/RBAC system - fall back to "any logged-in
    // internal role can see it" for those two, same as before this nav became permission-aware.
    if (user?.role === "Moderator" || user?.role === "FinanceAdmin") return true;
    return item.permission ? hasPermission(item.permission) : true;
  });

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col bg-brand-800 text-brand-50">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Logo dark />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-500 text-white" : "text-brand-100 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-brand-200">Bira Control Portal</p>
        <p className="text-[11px] text-brand-300/70">Internal use only</p>
      </div>
    </aside>
  );
}
