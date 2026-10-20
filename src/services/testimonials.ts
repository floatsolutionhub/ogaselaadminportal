// Ogasela.Api/Controllers/Marketing/TestimonialsController.cs - admin routes (marketing.testimonials.manage).
import { api } from "../lib/apiClient";
import type { Testimonial } from "../types/api";

export interface TestimonialInput {
  quote: string;
  name: string;
  role: string;
  rating: number;
}

/** Newest first. */
export function getTestimonials(): Promise<Testimonial[]> {
  return api.get<Testimonial[]>("/admin/testimonials");
}

/** consentConfirmed must be true - the server refuses otherwise. */
export function createTestimonial(
  input: TestimonialInput & { isPublished: boolean; consentConfirmed: boolean },
): Promise<Testimonial> {
  return api.post<Testimonial>("/admin/testimonials", input);
}

export function updateTestimonial(id: string, input: TestimonialInput): Promise<void> {
  return api.put<void>(`/admin/testimonials/${id}`, input);
}

export function setTestimonialPublished(id: string, isPublished: boolean): Promise<void> {
  return api.post<void>(`/admin/testimonials/${id}/${isPublished ? "publish" : "unpublish"}`);
}

export function deleteTestimonial(id: string): Promise<void> {
  return api.del<void>(`/admin/testimonials/${id}`);
}
