import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  BadgeCheck,
  FileClock,
  FileText,
  ListChecks,
  PackageCheck,
  ShieldAlert,
  Undo2,
  UserCog,
  Users,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { getPendingActions } from "../services/pendingActions";
import type { PendingActionKey } from "../types/api";

/** How often the counts are refreshed in the background. They also refresh on navigation and when the tab regains focus. */
const POLL_MS = 60_000;
const BASE_TITLE = document.title;
const DESKTOP_ALERTS_KEY = "ogasela.portal.desktopAlerts";

export interface PendingActionView {
  key: PendingActionKey;
  count: number;
  /** e.g. "3 ads awaiting approval". */
  label: string;
  /** Where the work is - a link that opens the list already filtered to it where the page supports that. */
  to: string;
  icon: LucideIcon;
}

const VIEW: Record<PendingActionKey, { to: string; icon: LucideIcon; label: (n: number) => string }> = {
  reports: { to: "/moderation", icon: ShieldAlert, label: (n) => `${n} report${n === 1 ? "" : "s"} to review` },
  adApprovals: { to: "/ad-approvals", icon: BadgeCheck, label: (n) => `${n} ad${n === 1 ? "" : "s"} awaiting approval` },
  manualReview: { to: "/manual-review", icon: FileClock, label: (n) => `${n} face verification${n === 1 ? "" : "s"} to decide` },
  changeRequests: { to: "/change-requests", icon: UserCog, label: (n) => `${n} profile change${n === 1 ? "" : "s"} to approve` },
  userDocuments: {
    to: "/users?status=DocumentsPending",
    icon: FileText,
    label: (n) => `${n} user${n === 1 ? "" : "s"} with documents to review`,
  },
  disputes: { to: "/disputes", icon: Scale, label: (n) => `${n} open dispute${n === 1 ? "" : "s"}` },
  officePickups: { to: "/office-pickups", icon: PackageCheck, label: (n) => `${n} office pickup${n === 1 ? "" : "s"} in progress` },
  pickupRefunds: {
    to: "/office-pickups?cancellationRequested=1",
    icon: Undo2,
    label: (n) => `${n} pickup cancellation${n === 1 ? "" : "s"} to refund`,
  },
  staffApprovals: { to: "/staff?status=PendingApproval", icon: Users, label: (n) => `${n} staff onboarding${n === 1 ? "" : "s"} to approve` },
  waitlistSignups: { to: "/waitlist?status=New", icon: ListChecks, label: (n) => `${n} new waitlist & tester signup${n === 1 ? "" : "s"}` },
};

interface PendingActionsState {
  /** Only the queues with something waiting, biggest first. */
  items: PendingActionView[];
  total: number;
  /** True until the first response arrives. */
  isLoading: boolean;
  /** Count waiting behind a sidebar route (its path, without the query string). */
  countFor: (path: string) => number;
  refresh: () => void;
  desktopAlerts: "on" | "off" | "blocked" | "unsupported";
  enableDesktopAlerts: () => Promise<void>;
  disableDesktopAlerts: () => void;
}

const PendingActionsContext = createContext<PendingActionsState | null>(null);

function readDesktopAlerts(): PendingActionsState["desktopAlerts"] {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    return Notification.permission === "granted" && localStorage.getItem(DESKTOP_ALERTS_KEY) === "on" ? "on" : "off";
  } catch {
    return "off";
  }
}

/**
 * Keeps the notification bell, the sidebar badges and the tab title in step with
 * /admin/pending-actions. When a queue grows (new work arrived since the last check) and desktop
 * alerts are on, a system notification is shown too - useful when the portal sits in a background tab.
 */
export function PendingActionsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [counts, setCounts] = useState<Partial<Record<PendingActionKey, number>> | null>(null);
  const [desktopAlerts, setDesktopAlerts] = useState(readDesktopAlerts);
  const previous = useRef<Partial<Record<PendingActionKey, number>> | null>(null);
  const alertsRef = useRef(desktopAlerts);
  alertsRef.current = desktopAlerts;

  const refresh = useCallback(() => {
    getPendingActions()
      .then((result) => {
        const next = Object.fromEntries(result.items.map((i) => [i.key, i.count])) as Partial<Record<PendingActionKey, number>>;
        const before = previous.current;
        if (before && alertsRef.current === "on" && document.visibilityState !== "visible") {
          const grown = result.items.filter((i) => i.count > (before[i.key] ?? 0));
          if (grown.length > 0) {
            const first = VIEW[grown[0].key];
            const notification = new Notification("New work in the Control Portal", {
              body: grown.map((i) => VIEW[i.key].label(i.count)).join("\n"),
              tag: "ogasela-pending-actions",
            });
            notification.onclick = () => {
              window.focus();
              window.location.assign(first.to);
            };
          }
        }
        previous.current = next;
        setCounts(next);
      })
      // A failed background refresh keeps the last counts rather than flashing an error.
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(refresh, POLL_MS);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  // Acting on an item usually means leaving or reloading its page - refresh so the badge drops right away.
  useEffect(() => {
    refresh();
  }, [location.pathname, location.search, refresh]);

  const items: PendingActionView[] = counts
    ? (Object.entries(counts) as [PendingActionKey, number][])
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ key, count, label: VIEW[key].label(count), to: VIEW[key].to, icon: VIEW[key].icon }))
    : [];
  const total = items.reduce((sum, i) => sum + i.count, 0);

  useEffect(() => {
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${BASE_TITLE}` : BASE_TITLE;
  }, [total]);
  useEffect(() => () => void (document.title = BASE_TITLE), []);

  const countFor = useCallback(
    (path: string) => items.filter((i) => i.to.split("?")[0] === path).reduce((sum, i) => sum + i.count, 0),
    [items],
  );

  async function enableDesktopAlerts() {
    if (typeof Notification === "undefined") return;
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") {
      try {
        localStorage.setItem(DESKTOP_ALERTS_KEY, "on");
      } catch {
        // Private mode - alerts stay on for this visit only.
      }
      setDesktopAlerts("on");
    } else {
      setDesktopAlerts(permission === "denied" ? "blocked" : "off");
    }
  }

  function disableDesktopAlerts() {
    try {
      localStorage.removeItem(DESKTOP_ALERTS_KEY);
    } catch {
      // Nothing stored to remove.
    }
    setDesktopAlerts("off");
  }

  return (
    <PendingActionsContext.Provider
      value={{
        items,
        total,
        isLoading: counts === null,
        countFor,
        refresh,
        desktopAlerts,
        enableDesktopAlerts,
        disableDesktopAlerts,
      }}
    >
      {children}
    </PendingActionsContext.Provider>
  );
}

export function usePendingActions(): PendingActionsState {
  const context = useContext(PendingActionsContext);
  if (!context) throw new Error("usePendingActions must be used inside PendingActionsProvider");
  return context;
}
