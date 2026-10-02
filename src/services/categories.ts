// Ogasela.Api/Controllers/Promotions/CategoriesController.cs - create is SuperAdmin-only.
import { api } from "../lib/apiClient";
import type { Category } from "../types/api";

export function getCategories(): Promise<Category[]> {
  return api.get<Category[]>("/categories");
}

export interface CreateCategoryInput {
  name: string;
  isFreeEligible: boolean;
  image: File | null;
  /** Required (at least one) for a top-level category - the API saves them together. */
  subcategories: string[];
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("isFreeEligible", String(input.isFreeEligible));
  if (input.image) formData.append("image", input.image);
  for (const subcategory of input.subcategories) formData.append("subcategories", subcategory);
  return api.postForm<Category>("/admin/categories", formData);
}

/** Adds one more subcategory to an existing top-level category; inherits its free-eligibility. */
export function createSubcategory(parent: Category, name: string, image: File | null): Promise<Category> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("parentCategoryId", parent.id);
  formData.append("isFreeEligible", String(parent.isFreeEligible));
  formData.append("attributeSchemaVersion", String(parent.attributeSchemaVersion));
  if (image) formData.append("image", image);
  return api.postForm<Category>("/admin/categories", formData);
}
