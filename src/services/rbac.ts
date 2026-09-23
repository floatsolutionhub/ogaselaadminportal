// Ogasela.Api/Controllers/Rbac/RbacController.cs - one function per route, in the same order they're declared there.
import { api } from "../lib/apiClient";
import type { Department, OrgUnit, Permission, Role, RoleType } from "../types/api";

export function getDepartments(): Promise<Department[]> {
  return api.get<Department[]>("/rbac/departments");
}

export function createDepartment(name: string, description: string | null): Promise<Department> {
  return api.post<Department>("/rbac/departments", { name, description });
}

export function updateDepartment(id: string, name: string, description: string | null): Promise<Department> {
  return api.put<Department>(`/rbac/departments/${id}`, { name, description });
}

export function getUnits(departmentId?: string): Promise<OrgUnit[]> {
  const params = departmentId ? `?departmentId=${departmentId}` : "";
  return api.get<OrgUnit[]>(`/rbac/units${params}`);
}

export function createUnit(departmentId: string, name: string, description: string | null): Promise<OrgUnit> {
  return api.post<OrgUnit>("/rbac/units", { departmentId, name, description });
}

export function updateUnit(id: string, name: string, description: string | null): Promise<OrgUnit> {
  return api.put<OrgUnit>(`/rbac/units/${id}`, { name, description });
}

export function getPermissionCatalog(): Promise<Permission[]> {
  return api.get<Permission[]>("/rbac/permissions");
}

export function getRoles(): Promise<Role[]> {
  return api.get<Role[]>("/rbac/roles");
}

export function createRole(name: string, roleType: RoleType, permissionKeys: string[]): Promise<Role> {
  return api.post<Role>("/rbac/roles", { name, roleType, permissionKeys });
}

export function updateRole(id: string, name: string, permissionKeys: string[]): Promise<Role> {
  return api.put<Role>(`/rbac/roles/${id}`, { name, permissionKeys });
}
