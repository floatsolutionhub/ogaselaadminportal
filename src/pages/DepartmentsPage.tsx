import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { useApiQuery } from "../lib/useApiQuery";
import { ApiError } from "../lib/apiClient";
import { createDepartment, createUnit, getDepartments, getUnits, updateDepartment, updateUnit } from "../services/rbac";
import type { Department, OrgUnit } from "../types/api";
import { Card } from "../components/Card";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";

export function DepartmentsPage() {
  const { data: departments, isLoading, error, refetch: refetchDepartments } = useApiQuery(() => getDepartments());
  const { data: units, refetch: refetchUnits } = useApiQuery(() => getUnits());

  const [departmentModal, setDepartmentModal] = useState<{ department: Department | null } | null>(null);
  const [unitModal, setUnitModal] = useState<{ departmentId: string; unit: OrgUnit | null } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function openDepartmentModal(department: Department | null) {
    setFormError(null);
    setName(department?.name ?? "");
    setDescription(department?.description ?? "");
    setDepartmentModal({ department });
  }

  function openUnitModal(departmentId: string, unit: OrgUnit | null) {
    setFormError(null);
    setName(unit?.name ?? "");
    setDescription(unit?.description ?? "");
    setUnitModal({ departmentId, unit });
  }

  async function saveDepartment() {
    if (!name.trim()) return;
    setIsSaving(true);
    setFormError(null);
    try {
      if (departmentModal?.department) {
        await updateDepartment(departmentModal.department.id, name.trim(), description.trim() || null);
      } else {
        await createDepartment(name.trim(), description.trim() || null);
      }
      setDepartmentModal(null);
      refetchDepartments();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save this department.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveUnit() {
    if (!name.trim() || !unitModal) return;
    setIsSaving(true);
    setFormError(null);
    try {
      if (unitModal.unit) {
        await updateUnit(unitModal.unit.id, name.trim(), description.trim() || null);
      } else {
        await createUnit(unitModal.departmentId, name.trim(), description.trim() || null);
      }
      setUnitModal(null);
      refetchUnits();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save this unit.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Departments &amp; units</h2>
          <p className="text-xs text-ink-muted">The org structure staff are assigned into when onboarded.</p>
        </div>
        <button
          type="button"
          onClick={() => openDepartmentModal(null)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> New department
        </button>
      </div>

      {!departments || departments.length === 0 ? (
        <EmptyState icon={Building2} title="No departments yet" description="Create your first department to start structuring staff." />
      ) : (
        <div className="space-y-4">
          {departments.map((department) => {
            const departmentUnits = (units ?? []).filter((u) => u.departmentId === department.id);
            return (
              <Card key={department.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{department.name}</h3>
                    {department.description && <p className="text-xs text-ink-muted">{department.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openUnitModal(department.id, null)}
                      className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-ink hover:bg-black/5"
                    >
                      Add unit
                    </button>
                    <button
                      type="button"
                      onClick={() => openDepartmentModal(department)}
                      className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-ink hover:bg-black/5"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {departmentUnits.length > 0 && (
                  <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4">
                    {departmentUnits.map((unit) => (
                      <li key={unit.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink">{unit.name}</span>
                        <button
                          type="button"
                          onClick={() => openUnitModal(department.id, unit)}
                          className="text-xs font-medium text-ink-muted hover:text-brand-600"
                        >
                          Edit
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!departmentModal}
        onClose={() => setDepartmentModal(null)}
        title={departmentModal?.department ? "Edit department" : "New department"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          {formError && <ErrorBanner message={formError} />}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDepartmentModal(null)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDepartment}
              disabled={!name.trim() || isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSaving && <Spinner size={14} />}
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!unitModal} onClose={() => setUnitModal(null)} title={unitModal?.unit ? "Edit unit" : "New unit"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Description</label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          {formError && <ErrorBanner message={formError} />}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setUnitModal(null)}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveUnit}
              disabled={!name.trim() || isSaving}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSaving && <Spinner size={14} />}
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
