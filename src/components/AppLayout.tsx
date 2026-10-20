import { Outlet, useLocation } from "react-router-dom";
import { PendingActionsProvider } from "../lib/pendingActions";
import { IdleLogoutWarning } from "./IdleLogoutWarning";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/moderation": "Moderation Queue",
  "/manual-review": "Manual Review",
  "/audit-log": "Audit Log",
  "/data-erasure": "Data Erasure",
  "/staff": "Staff",
  "/staff/new": "Onboard Staff",
  "/departments": "Departments",
  "/roles": "Roles",
  "/locations": "Locations",
  "/change-requests": "Change Requests",
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Param routes (e.g. /staff/:id) aren't in the exact-match table above - fall back to the
  // nearest parent segment's title rather than adding one entry per possible id.
  if (pathname.startsWith("/staff/")) return "Staff";
  return "Ogasela Control Portal";
}

export function AppLayout() {
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <PendingActionsProvider>
      <div className="flex h-screen overflow-hidden bg-surface">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar title={title} />
          <main className="scrollbar-thin flex-1 overflow-y-auto bg-linear-to-b from-brand-50/40 via-surface to-surface p-8">
            <Outlet />
          </main>
        </div>
        <IdleLogoutWarning />
      </div>
    </PendingActionsProvider>
  );
}
