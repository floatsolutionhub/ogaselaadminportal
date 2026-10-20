import { useState } from "react";
import { MessageSquareQuote, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { ApiError } from "../lib/apiClient";
import { useApiQuery } from "../lib/useApiQuery";
import { formatDateTime } from "../lib/format";
import {
  createTestimonial,
  deleteTestimonial,
  getTestimonials,
  setTestimonialPublished,
  updateTestimonial,
} from "../services/testimonials";
import type { Testimonial } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";

const inputClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/** Mirrors Testimonial.*MaxLength and TestimonialHandlers.MaxPublished in Ogasela.API. */
const QUOTE_MAX = 400;
const NAME_MAX = 80;
const ROLE_MAX = 80;
const MAX_SHOWN = 6;

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-black/15"} />
      ))}
    </span>
  );
}

/** Add (testimonial = null) or edit one. */
function TestimonialModal({
  open,
  testimonial,
  onClose,
  onSaved,
}: {
  open: boolean;
  testimonial: Testimonial | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = testimonial !== null;
  const [quote, setQuote] = useState(testimonial?.quote ?? "");
  const [name, setName] = useState(testimonial?.name ?? "");
  const [role, setRole] = useState(testimonial?.role ?? "");
  const [rating, setRating] = useState(testimonial?.rating ?? 5);
  const [isPublished, setIsPublished] = useState(true);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = quote.trim() && name.trim() && role.trim() && (isEdit || consent) && !isSaving;

  async function save() {
    setIsSaving(true);
    setError(null);
    const input = { quote: quote.trim(), name: name.trim(), role: role.trim(), rating };
    try {
      if (isEdit) {
        await updateTestimonial(testimonial.id, input);
      } else {
        await createTestimonial({ ...input, isPublished, consentConfirmed: consent });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this testimonial.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit testimonial" : "New testimonial"}
      description="Shown in the “Word on the street” section of the ogasela.com homepage."
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Quote</label>
          <textarea
            value={quote}
            maxLength={QUOTE_MAX}
            rows={4}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="In their own words…"
            className={inputClassName}
          />
          <p className="mt-1 text-right text-[11px] text-ink-muted">
            {quote.length}/{QUOTE_MAX}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
            <input
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chioma A."
              className={inputClassName}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Who they are</label>
            <input
              value={role}
              maxLength={ROLE_MAX}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Seller, Ikeja"
              className={inputClassName}
            />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Rating</p>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onClick={() => setRating(n)}
                className="rounded p-0.5 hover:bg-black/5"
              >
                <Star size={22} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-black/20"} />
              </button>
            ))}
          </div>
        </div>

        {!isEdit && (
          <>
            <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-500"
              />
              <span>
                This is a real Ogasela user, and they agreed to be quoted under this name.
                <span className="block text-xs text-ink-muted">
                  Invented reviews mislead buyers and can break consumer-protection rules.
                </span>
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
              Publish now (show it on the website)
            </label>
          </>
        )}

        {error && <ErrorBanner message={error} />}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
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
          {isEdit ? "Save changes" : "Add testimonial"}
        </button>
      </div>
    </Modal>
  );
}

export function TestimonialsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getTestimonials());
  /** undefined = closed, null = adding, a testimonial = editing it. */
  const [editing, setEditing] = useState<Testimonial | null | undefined>(undefined);
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

  function remove(item: Testimonial) {
    if (!window.confirm(`Delete ${item.name}'s testimonial? This can't be undone.`)) return;
    run(item.id, () => deleteTestimonial(item.id), "Could not delete this testimonial.");
  }

  const items = data ?? [];
  const publishedCount = items.filter((t) => t.isPublished).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Homepage testimonials</h2>
          <p className="text-xs text-ink-muted">
            The website shows the {MAX_SHOWN} newest published ones. The section stays hidden until at least one is
            published.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> New testimonial
        </button>
      </div>

      {publishedCount > MAX_SHOWN && (
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {publishedCount} are published, so only the {MAX_SHOWN} newest appear on the website.
        </p>
      )}
      {actionError && <ErrorBanner message={actionError} />}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="No testimonials yet"
          description="Add one from a real buyer or seller to show the section on the homepage."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Stars rating={item.rating} />
                {item.isPublished ? <Badge tone="success">Live</Badge> : <Badge>Hidden</Badge>}
              </div>
              <p className="whitespace-pre-line text-sm text-ink">“{item.quote}”</p>
              <div>
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-muted">{item.role}</p>
              </div>
              <p className="text-[11px] text-ink-muted">
                Added {formatDateTime(item.createdAt)}
                {item.updatedAt && ` · edited ${formatDateTime(item.updatedAt)}`}
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() =>
                    run(
                      item.id,
                      () => setTestimonialPublished(item.id, !item.isPublished),
                      "Could not update this testimonial.",
                    )
                  }
                  className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold text-ink hover:bg-black/5 disabled:opacity-60"
                >
                  {item.isPublished ? "Hide from website" : "Publish"}
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => setEditing(item)}
                  aria-label="Edit testimonial"
                  className="rounded-lg border border-black/10 px-3 py-2 text-ink hover:bg-black/5 disabled:opacity-60"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => remove(item)}
                  aria-label="Delete testimonial"
                  className="rounded-lg border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <TestimonialModal
          // Remount per testimonial so the form starts from its current values.
          key={editing?.id ?? "new"}
          open
          testimonial={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            refetch();
          }}
        />
      )}
    </div>
  );
}
