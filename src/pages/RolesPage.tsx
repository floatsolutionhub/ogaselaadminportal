import { useMemo, useState } from "react";
import { KeySquare, Plus } from "lucide-react";
import { useApiQuery } from "../lib/useApiQuery";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/apiClient";
import { createRole, getPermissionCatalog, getRoles, updateRole } from "../services/rbac";
import type { Permission, Role, RoleType } from "../types/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";

/** Mirrors StaffHierarchy.CanAssign - which RoleType the current user may create/edit a role as. */
function assignableRoleTypes(actorTier: RoleType | null): RoleType[] {
  switch (actorTier) {
    case "SuperAdmin":
      return ["SuperAdmin", "Admin"];
    case "Admin":
      return ["HR"];
    case "HR":
      return ["Standard"];
    default:
      return [];
  }
}

function groupByCategory(permissions: Permission[]): Map<string, Permission[]> {
  const map = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const group = map.get(permission.category) ?? [];
    group.push(permission);
    map.set(permission.category, group);
  }
  return map;
}

export function RolesPage() {
  const { user, isSuperAdmin } = useAuth();
  const actorTier: RoleType | null = isSuperAdmin ? "SuperAdmin" : (user?.staffProfile?.roleType ?? null);
  const allowedRoleTypes = useMemo(() => assignableRoleTypes(actorTier), [actorTier]);

  const { data: roles, isLoading, error, refetch } = useApiQuery(() => getRoles());
  const { data: permissions } = useApiQuery(() => getPermissionCatalog());
  const grouped = useMemo(() => groupByCategory(permissions ?? []), [permissions]);

  const [modalRole, setModalRole] = useState<Role | null | "new">(null);
  const [name, setName] = useState("");
  const [roleType, setRoleType] = useState<RoleType>(allowedRoleTypes[0] ?? "Standard");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setFormError(null);
    setName("");
    setRoleType(allowedRoleTypes[0] ?? "Standard");
    setSelectedKeys(new Set());
    setModalRole("new");
  }

  function openEdit(role: Role) {
    setFormError(null);
    setName(role.name);
    setRoleType(role.roleType);
    setSelectedKeys(new Set(role.permissionKeys));
    setModalRole(role);
  }

  function togglePermission(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    if (!name.trim()) return;
    setIsSaving(true);
    setFormError(null);
    try {
      const keys = Array.from(selectedKeys);
      if (modalRole === "new") {
        await createRole(name.trim(), roleType, keys);
      } else if (modalRole) {
        await updateRole(modalRole.id, name.trim(), keys);
      }
      setModalRole(null);
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save this role.");
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
          <h2 className="text-sm font-semibold text-ink">Roles</h2>
          <p className="text-xs text-ink-muted">
            You can create or edit {allowedRoleTypes.length === 0 ? "no" : allowedRoleTypes.join("/")}-tier roles.
          </p>
        </div>
        {allowedRoleTypes.length > 0 && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus size={15} /> New role
          </button>
        )}
      </div>

      {!roles || roles.length === 0 ? (
        <EmptyState icon={KeySquare} title="No roles yet" description="Create a role to start assigning staff." />
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-black/[0.02] text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Permissions</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{role.name}</td>
                  <td className="px-5 py-3">
                    <Badge tone="brand">{role.roleType}</Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{role.permissionKeys.length} granted</td>
                  <td className="px-5 py-3 text-right">
                    {allowedRoleTypes.includes(role.roleType) && (
                      <button type="button" onClick={() => openEdit(role)} className="text-xs font-medium text-brand-600 hover:underline">
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!modalRole}
        onClose={() => setModalRole(null)}
        title={modalRole === "new" ? "New role" : "Edit role"}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Type</label>
              <Select
                value={roleType}
                onChange={(event) => setRoleType(event.target.value as RoleType)}
                disabled={modalRole !== "new"}
                options={allowedRoleTypes.map((rt) => ({ value: rt, label: rt }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink">Permissions</label>
            <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border border-black/10 p-4">
              {Array.from(grouped.entries()).map(([category, perms]) => (
                <div key={category}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">{category}</p>
                  <div className="space-y-1.5">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                          className="rounded border-black/20 text-brand-500 focus:ring-brand-200"
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {formError && <ErrorBanner message={formError} />}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalRole(null)}
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
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
