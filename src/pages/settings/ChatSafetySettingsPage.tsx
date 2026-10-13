import { useEffect, useState } from "react";
import { Check, ShieldAlert } from "lucide-react";
import { ApiError } from "../../lib/apiClient";
import { useApiQuery } from "../../lib/useApiQuery";
import { formatDateTime } from "../../lib/format";
import { getPlatformSettings, updatePlatformSettings } from "../../services/settings";
import { Card } from "../../components/Card";
import { Spinner } from "../../components/Spinner";
import { ErrorBanner } from "../../components/ErrorBanner";
import { SettingsHeader } from "./SettingsHeader";

/** Matches PlatformSettingDefaults on the API. */
export const DEFAULT_SAFETY_NOTICE = "Do not send money for an item you have not seen and verified";
const MAX_LENGTH = 300;

export function ChatSafetySettingsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getPlatformSettings());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (data) setText(data.messagingSafetyNotice);
  }, [data]);

  async function save(value: string, message: string) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await updatePlatformSettings({ messagingSafetyNotice: value });
      setNotice(message);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't save the notice.");
    } finally {
      setBusy(false);
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

  const trimmed = text.trim();
  const unchanged = trimmed === data.messagingSafetyNotice;
  const isDefault = data.messagingSafetyNotice === DEFAULT_SAFETY_NOTICE;

  return (
    <div className="space-y-4">
      <SettingsHeader
        title="Chat safety notice"
        description={`The caption every buyer and seller sees above the message box in a chat. ${
          data.updatedAt ? `Settings last changed ${formatDateTime(data.updatedAt)}.` : ""
        }`}
      />

      {actionError && <ErrorBanner message={actionError} />}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <Check size={16} /> {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Notice text</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={MAX_LENGTH}
            aria-label="Chat safety notice"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">
              {text.length}/{MAX_LENGTH}
              {!trimmed && <span className="ml-2 text-rose-600">The notice can't be empty.</span>}
            </p>
            <div className="flex items-center gap-2">
              {!isDefault && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save(DEFAULT_SAFETY_NOTICE, "Chat safety notice reset to the default.")}
                  className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium text-ink-muted hover:bg-black/5 disabled:opacity-50"
                >
                  Reset to default
                </button>
              )}
              <button
                type="button"
                disabled={busy || !trimmed || unchanged}
                onClick={() => save(trimmed, "Chat safety notice updated - chats show it from now on.")}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy && <Spinner size={14} />} Save
              </button>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-ink">Preview</h3>
          <p className="text-xs text-ink-muted">How it looks in the app, just above "Type a message".</p>
          <div className="rounded-xl bg-[#FAFAF5] p-3">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-700" />
              <p className="text-xs font-medium text-ink">{trimmed || DEFAULT_SAFETY_NOTICE}</p>
            </div>
            <div className="mt-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink-muted">
              Type a message
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
