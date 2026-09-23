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
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "./auth";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Omit for routes every logged-in staff member sees. */
  permission?: string;
}

/** One shared source of truth for the sidebar and the dashboard's "quick actions" - same routes, same gating. */
export const NAV_ITEMS: NavItem[] = [
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

/** Filters NAV_ITEMS down to what the current user should see - mirrors PermissionAuthorizationHandler's bypass rule. */
export function useVisibleNavItems(): NavItem[] {
  const { user, hasPermission } = useAuth();

  return NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    // Moderator/FinanceAdmin (the legacy fixed internal roles) have no permission claims at all,
    // since permissions only exist for the new Staff/RBAC system - fall back to "any logged-in
    // internal role can see it" for those two, same as before this nav became permission-aware.
    if (user?.role === "Moderator" || user?.role === "FinanceAdmin") return true;
    return hasPermission(item.permission);
  });
}
