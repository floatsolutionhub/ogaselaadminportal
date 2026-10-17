// Ogasela.Api/Controllers/Promotions/CategoriesController.cs - create and update are SuperAdmin-only.
import { api } from "../lib/apiClient";
import type { Category } from "../types/api";

export function getCategories(): Promise<Category[]> {
  return api.get<Category[]>("/categories");
}

export interface CreateCategoryInput {
  name: string;
  isFreeEligible: boolean;
  isOfficePickupEligible: boolean;
  image: File | null;
  /** Required (at least one) for a top-level category - the API saves them together. */
  subcategories: string[];
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("isFreeEligible", String(input.isFreeEligible));
  formData.append("isOfficePickupEligible", String(input.isOfficePickupEligible));
  if (input.image) formData.append("image", input.image);
  for (const subcategory of input.subcategories) formData.append("subcategories", subcategory);
  return api.postForm<Category>("/admin/categories", formData);
}

/** Adds one more subcategory to an existing top-level category; inherits its free-eligibility. */
export function createSubcategory(
  parent: Category,
  name: string,
  image: File | null,
  isOfficePickupEligible: boolean,
): Promise<Category> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("parentCategoryId", parent.id);
  formData.append("isFreeEligible", String(parent.isFreeEligible));
  formData.append("attributeSchemaVersion", String(parent.attributeSchemaVersion));
  formData.append("isOfficePickupEligible", String(isOfficePickupEligible));
  if (image) formData.append("image", image);
  return api.postForm<Category>("/admin/categories", formData);
}

export interface UpdateCategoryInput {
  name: string;
  /** Ignored for a subcategory - it always follows its parent's setting. */
  isFreeEligible: boolean;
  isOfficePickupEligible: boolean;
  /** A new image replaces the current one; null keeps it. */
  image: File | null;
}

/**
 * Renames a category or subcategory, swaps its image, or (top-level only) changes whether the Free
 * plan may be used - the API applies that to its subcategories too. It never moves a category.
 */
export function updateCategory(category: Category, input: UpdateCategoryInput): Promise<Category> {
  const formData = new FormData();
  formData.append("name", input.name);
  if (category.parentCategoryId) formData.append("parentCategoryId", category.parentCategoryId);
  formData.append(
    "isFreeEligible",
    String(category.parentCategoryId ? category.isFreeEligible : input.isFreeEligible),
  );
  formData.append("attributeSchemaVersion", String(category.attributeSchemaVersion));
  formData.append("isOfficePickupEligible", String(input.isOfficePickupEligible));
  if (input.image) formData.append("image", input.image);
  return api.putForm<Category>(`/admin/categories/${category.id}`, formData);
}
