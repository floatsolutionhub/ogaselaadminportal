import { useState } from "react";
import { Bell, Check, Mail, type LucideIcon } from "lucide-react";
import { ApiError } from "../../lib/apiClient";
import { useApiQuery } from "../../lib/useApiQuery";
import { getPlatformSettings, updatePlatformSettings } from "../../services/settings";
import type { NotificationChannel } from "../../types/api";
import { Card } from "../../components/Card";
import { Spinner } from "../../components/Spinner";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Toggle } from "../../components/Toggle";
import { SettingsHeader } from "./SettingsHeader";

const CHANNEL: Record<NotificationChannel, { label: string; icon: LucideIcon }> = {
  Push: { label: "Push notification", icon: Bell },
  Email: { label: "Email", icon: Mail },
  Sms: { label: "SMS", icon: Mail },
  WhatsApp: { label: "WhatsApp", icon: Mail },
};

export function NotificationsSettingsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getPlatformSettings());
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function toggle(category: string, label: string, channel: NotificationChannel, enabled: boolean) {
    const key = `${category}.${channel}`;
    setBusy(key);
    setActionError(null);
    setNotice(null);
    try {
      await updatePlatformSettings({ notifications: [{ category, channel, enabled }] });
      setNotice(`${label} ${CHANNEL[channel].label.toLowerCase()}s ${enabled ? "switched on" : "switched off"} for everyone.`);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't save the setting.");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorBanner message={error ?? "Couldn't load settings."} />;
  }

  return (
    <div className="space-y-4">
      <SettingsHeader
        title="Notifications"
        description="Switch a notification off here and nobody gets it on that channel. When it's on, each seller can still turn it off for themselves in the app. The in-app notification bell is always on."
      />

      {actionError && <ErrorBanner message={actionError} />}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <Check size={16} /> {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.notifications.map((category) => (
          <Card key={category.category}>
            <h3 className="text-sm font-semibold text-ink">{category.label}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">{category.description}</p>
            <ul className="mt-3 divide-y divide-black/5 rounded-xl border border-black/5">
              {category.channels.map(({ channel, enabled }) => {
                const { label, icon: Icon } = CHANNEL[channel];
                const key = `${category.category}.${channel}`;
                return (
                  <li key={channel} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-ink">
                      <Icon size={15} className="text-ink-muted" /> {label}
                    </span>
                    <span className="flex items-center gap-2">
                      {busy === key && <Spinner size={14} />}
                      <Toggle
                        label={`${category.label}: ${label}`}
                        checked={enabled}
                        disabled={!!busy}
                        onChange={(on) => toggle(category.category, category.label, channel, on)}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
