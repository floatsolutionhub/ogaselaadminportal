import { useEffect, useMemo, useState } from "react";
import { Megaphone, Plus, Trash2, X } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { formatDateTime } from "../lib/format";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  setAnnouncementActive,
} from "../services/announcements";
import type { Announcement } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { FileInput } from "../components/FileInput";
import { Modal } from "../components/Modal";

const inputClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/** Roughly how the pop-up looks in the app, so the admin can check copy and image before publishing. */
function PhonePreview({
  title,
  caption,
  imageUrl,
  ctaLabel,
}: {
  title: string;
  caption: string;
  imageUrl: string | null;
  ctaLabel: string | null;
}) {
  return (
    <div className="mx-auto w-64 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-brand-50">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-muted">Image</div>
        )}
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
          <X size={14} />
        </span>
      </div>
      <div className="p-4">
        <p className="text-sm font-bold text-ink">{title || "Title"}</p>
        <p className="mt-1 whitespace-pre-line text-xs text-ink-muted">{caption || "Caption"}</p>
        {ctaLabel && (
          <div className="mt-3 rounded-xl bg-brand-600 py-2 text-center text-xs font-semibold text-white">{ctaLabel}</div>
        )}
      </div>
    </div>
  );
}

function NewAnnouncementModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [withCta, setWithCta] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const ctaValid = !withCta || (ctaLabel.trim().length > 0 && /^(https?:\/\/|ogasela:\/\/)\S+$/.test(ctaUrl.trim()));
  const canSave = title.trim() && caption.trim() && image && ctaValid && !isSaving;

  function reset() {
    setTitle("");
    setCaption("");
    setImage(null);
    setWithCta(false);
    setCtaLabel("");
    setCtaUrl("");
    setIsActive(true);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function save() {
    if (!image) return;
    setIsSaving(true);
    setError(null);
    try {
      await createAnnouncement({
        title: title.trim(),
        caption: caption.trim(),
        image,
        ctaLabel: withCta ? ctaLabel.trim() : null,
        ctaUrl: withCta ? ctaUrl.trim() : null,
        isActive,
      });
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this announcement.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New announcement"
      description="Pops up once on the app's home screen for every user. Closing it counts as read."
      maxWidth="2xl"
    >
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Title</label>
            <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Caption</label>
            <textarea
              value={caption}
              maxLength={500}
              rows={3}
              onChange={(e) => setCaption(e.target.value)}
              className={inputClassName}
            />
          </div>
          <FileInput label="Image" file={image} onChange={setImage} accept="image/*" />

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={withCta}
              onChange={(e) => setWithCta(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            Add a button
          </label>
          {withCta && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-muted">Button label</label>
                <input
                  value={ctaLabel}
                  maxLength={40}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="e.g. Shop now"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-muted">Button link</label>
                <input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://… or ogasela://…"
                  className={inputClassName}
                />
              </div>
              {!ctaValid && (ctaLabel || ctaUrl) && (
                <p className="text-xs text-rose-600 sm:col-span-2">
                  Give the button a label and a link starting with https:// or ogasela://.
                </p>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            Publish now (show it in the app)
          </label>

          {error && <ErrorBanner message={error} />}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-ink-muted">Preview</p>
          <PhonePreview
            title={title}
            caption={caption}
            imageUrl={previewUrl}
            ctaLabel={withCta && ctaLabel.trim() ? ctaLabel.trim() : null}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={close}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {isSaving && <Spinner size={14} />}
          Create announcement
        </button>
      </div>
    </Modal>
  );
}

export function AnnouncementsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getAnnouncements());
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<void>, failure: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusyId(null);
    }
  }

  function remove(item: Announcement) {
    if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    run(item.id, () => deleteAnnouncement(item.id), "Could not delete this announcement.");
  }

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">App announcements</h2>
          <p className="text-xs text-ink-muted">
            Pop-ups on the app's home screen. Each user sees an active announcement once; closing it marks it read.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> New announcement
        </button>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : items.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Create one to show a pop-up in the app." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-3 !p-0 overflow-hidden">
              <img src={item.image} alt="" className="aspect-[4/3] w-full bg-brand-50 object-cover" />
              <div className="flex flex-1 flex-col gap-2 px-5 pb-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  {item.isActive ? <Badge tone="success">Live</Badge> : <Badge>Hidden</Badge>}
                </div>
                <p className="line-clamp-3 whitespace-pre-line text-xs text-ink-muted">{item.caption}</p>
                {item.cta && (
                  <p className="truncate text-xs text-ink-muted">
                    Button: <span className="font-medium text-ink">{item.cta.label}</span> → {item.cta.url}
                  </p>
                )}
                <p className="text-[11px] text-ink-muted">Created {formatDateTime(item.createdAt)}</p>
                <div className="mt-auto flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() =>
                      run(item.id, () => setAnnouncementActive(item.id, !item.isActive), "Could not update this announcement.")
                    }
                    className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-ink hover:bg-black/5 disabled:opacity-60"
                  >
                    {item.isActive ? "Hide from app" : "Show in app"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => remove(item)}
                    aria-label="Delete announcement"
                    className="rounded-lg border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewAnnouncementModal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={() => {
          setIsCreating(false);
          refetch();
        }}
      />
    </div>
  );
}
