// Ogasela.Api/Controllers/Admin/AdminPendingActionsController.cs - work waiting on the signed-in staff member.
import { api } from "../lib/apiClient";
import type { PendingActions } from "../types/api";

export function getPendingActions(): Promise<PendingActions> {
  return api.get<PendingActions>("/admin/pending-actions");
}
