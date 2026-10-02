// Ogasela.Api/Controllers/Promotions/PromotionPlansController.cs and Admin/AdminSettingsController.cs - Settings (SuperAdmin).
import { api } from "../lib/apiClient";
import type { PlatformSettings, PromotionPlan, PromotionPlanInput, UpdatePlatformSettings } from "../types/api";

/** Every plan, cheapest first, including inactive ones. */
export function getPromotionPlans(): Promise<PromotionPlan[]> {
  return api.get<PromotionPlan[]>("/promotion-plans");
}

export function createPromotionPlan(input: PromotionPlanInput): Promise<PromotionPlan> {
  return api.post<PromotionPlan>("/admin/promotion-plans", input);
}

/** Full replace of the plan's terms. */
export function updatePromotionPlan(id: string, input: PromotionPlanInput): Promise<PromotionPlan> {
  return api.put<PromotionPlan>(`/admin/promotion-plans/${id}`, input);
}

export function getPlatformSettings(): Promise<PlatformSettings> {
  return api.get<PlatformSettings>("/admin/settings");
}

/** Only the fields sent are changed. */
export function updatePlatformSettings(changes: UpdatePlatformSettings): Promise<PlatformSettings> {
  return api.patch<PlatformSettings>("/admin/settings", changes);
}
