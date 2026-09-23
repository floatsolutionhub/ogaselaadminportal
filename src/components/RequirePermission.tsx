import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ShieldOff } from "lucide-react";

interface RequirePermissionProps {
  children: ReactNode;
  /** The staff member needs this permission key (or be a SuperAdmin). Omit if only requireSuperAdmin matters. */
  permission?: string;
  /** Hard-requires SuperAdmin (either flavour) regardless of permission claims - for routes that must stay exclusive to SuperAdmin even if a narrower role somehow holds the matching permission, e.g. Role management. */
  requireSuperAdmin?: boolean;
}

/**
 * Nested inside ProtectedRoute (so `user` is guaranteed non-null here) - gates an individual
 * route by permission/tier rather than just "is logged in". Unlike ProtectedRoute this doesn't
 * redirect away on failure - it renders an inline "access denied" message, since arriving here
 * usually means a stale nav link or a directly-typed URL, not an expired session.
 */
export function RequirePermission({ children, permission, requireSuperAdmin }: RequirePermissionProps) {
  const { user, isSuperAdmin, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = requireSuperAdmin ? isSuperAdmin : permission ? hasPermission(permission) : true;

  if (!allowed) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <ShieldOff size={32} className="text-ink-muted" />
        <div>
          <p className="text-sm font-semibold text-ink">You don't have access to this page</p>
          <p className="text-xs text-ink-muted">Contact a Super Admin if you think this is a mistake.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
