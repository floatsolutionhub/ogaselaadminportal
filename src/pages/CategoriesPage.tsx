import { useMemo, useState } from "react";
import { Plus, Shapes, X } from "lucide-react";
import { useApiQuery } from "../lib/useApiQuery";
import { ApiError } from "../lib/apiClient";
import { createCategory, createSubcategory, getCategories } from "../services/categories";
import type { Category } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { FileInput } from "../components/FileInput";
import { Modal } from "../components/Modal";

type CategoryWithChildren = Category & { children: Category[] };

const inputClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function NewCategoryModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [isFreeEligible, setIsFreeEligible] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [subcategories, setSubcategories] = useState<string[]>([""]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filledSubcategories = subcategories.map((value) => value.trim()).filter(Boolean);
  const canSave = name.trim().length > 0 && filledSubcategories.length > 0 && !isSaving;

  function reset() {
    setName("");
    setIsFreeEligible(true);
    setImage(null);
    setSubcategories([""]);
    setFormError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function save() {
    setFormError(null);
    const lowered = filledSubcategories.map((value) => value.toLowerCase());
    if (new Set(lowered).size !== lowered.length) {
      setFormError("Subcategory names must be unique.");
      return;
    }

    setIsSaving(true);
    try {
      await createCategory({ name: name.trim(), isFreeEligible, image, subcategories: filledSubcategories });
      reset();
      onCreated();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create this category.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New category"
      description="A category is created together with its subcategories - sellers post ads under a subcategory."
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Category name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Pets" className={inputClassName} />
        </div>

        <FileInput label="Category image (optional)" file={image} onChange={setImage} accept="image/*" />

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isFreeEligible}
            onChange={(event) => setIsFreeEligible(event.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          Sellers can post here on the Free plan
        </label>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Subcategories</label>
          <div className="space-y-2">
            {subcategories.map((value, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={value}
                  onChange={(event) =>
                    setSubcategories((prev) => prev.map((entry, i) => (i === index ? event.target.value : entry)))
                  }
                  placeholder={`Subcategory ${index + 1}`}
                  className={inputClassName}
                />
                {subcategories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSubcategories((prev) => prev.filter((_, i) => i !== index))}
                    className="text-ink-muted hover:text-rose-600"
                    aria-label="Remove subcategory"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSubcategories((prev) => [...prev, ""])}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
          >
            <Plus size={13} /> Add another subcategory
          </button>
          {filledSubcategories.length === 0 && (
            <p className="mt-1 text-xs text-ink-muted">Add at least one subcategory.</p>
          )}
        </div>

        {formError && <ErrorBanner message={formError} />}

        <div className="flex justify-end gap-3">
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
            Create category
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddSubcategoryModal({
  parent,
  onClose,
  onCreated,
}: {
  parent: Category | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function close() {
    setName("");
    setImage(null);
    setFormError(null);
    onClose();
  }

  async function save() {
    if (!parent || !name.trim()) return;
    setIsSaving(true);
    setFormError(null);
    try {
      await createSubcategory(parent, name.trim(), image);
      setName("");
      setImage(null);
      onCreated();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not add this subcategory.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={!!parent} onClose={close} title={`Add subcategory to ${parent?.name ?? ""}`}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Subcategory name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
        </div>
        <FileInput label="Subcategory image (optional)" file={image} onChange={setImage} accept="image/*" />
        {formError && <ErrorBanner message={formError} />}
        <div className="flex justify-end gap-3">
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
            disabled={!name.trim() || isSaving}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {isSaving && <Spinner size={14} />}
            Add subcategory
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function CategoriesPage() {
  const { data, isLoading, error, refetch } = useApiQuery(() => getCategories());
  const [isCreating, setIsCreating] = useState(false);
  const [addingTo, setAddingTo] = useState<Category | null>(null);

  const tree = useMemo<CategoryWithChildren[]>(() => {
    const all = data ?? [];
    return all
      .filter((category) => category.parentCategoryId === null)
      .map((category) => ({
        ...category,
        children: all.filter((child) => child.parentCategoryId === category.id),
      }));
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Categories</h2>
          <p className="text-xs text-ink-muted">
            What sellers can post under. Every category has subcategories, and ads are posted to a subcategory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> New category
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : tree.length === 0 ? (
        <EmptyState icon={Shapes} title="No categories yet" description="Create your first category and its subcategories." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tree.map((category) => (
            <Card key={category.id} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Shapes size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{category.name}</p>
                  <p className="text-xs text-ink-muted">
                    {category.children.length} {category.children.length === 1 ? "subcategory" : "subcategories"}
                  </p>
                </div>
                {category.isFreeEligible ? <Badge tone="success">Free plan</Badge> : <Badge>Paid only</Badge>}
              </div>

              {category.children.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {category.children.map((child) => (
                    <span key={child.id} className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-ink">
                      {child.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-700">No subcategories yet - sellers can't post here until one is added.</p>
              )}

              <button
                type="button"
                onClick={() => setAddingTo(category)}
                className="mt-auto flex items-center gap-1 self-start text-xs font-semibold text-brand-600 hover:underline"
              >
                <Plus size={13} /> Add subcategory
              </button>
            </Card>
          ))}
        </div>
      )}

      <NewCategoryModal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={() => {
          setIsCreating(false);
          refetch();
        }}
      />
      <AddSubcategoryModal
        parent={addingTo}
        onClose={() => setAddingTo(null)}
        onCreated={() => {
          setAddingTo(null);
          refetch();
        }}
      />
    </div>
  );
}
