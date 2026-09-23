import { LogOut } from "lucide-react";
import { useAuth } from "../lib/auth";

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin: "Super Admin",
  FinanceAdmin: "Finance Admin",
  Moderator: "Moderator",
};

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const displayName = user?.name ?? user?.phone ?? user?.email ?? "Admin";
  const initial = displayName.trim().charAt(0).toUpperCase();
  // Staff accounts carry their actual assigned role name (e.g. "HR", "Content Moderator") on
  // staffProfile - only Moderator/FinanceAdmin/SuperAdmin (the legacy fixed roles) need the
  // static label lookup.
  const roleLabel = user?.staffProfile?.roleName ?? (user ? (ROLE_LABEL[user.role] ?? user.role) : "");

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-black/5 bg-white px-8">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {initial}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-ink">{displayName}</p>
            <p className="text-xs text-ink-muted">{roleLabel}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </header>
  );
}
