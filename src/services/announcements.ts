// Ogasela.Api/Controllers/Marketing/AnnouncementsController.cs - admin routes (SuperAdmin only).
import { api } from "../lib/apiClient";
import type { Announcement } from "../types/api";

export function getAnnouncements(): Promise<Announcement[]> {
  return api.get<Announcement[]>("/admin/announcements");
}

export interface CreateAnnouncementInput {
  title: string;
  caption: string;
  image: File;
  ctaLabel: string | null;
  ctaUrl: string | null;
  isActive: boolean;
}

export function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("caption", input.caption);
  formData.append("image", input.image);
  if (input.ctaLabel && input.ctaUrl) {
    formData.append("ctaLabel", input.ctaLabel);
    formData.append("ctaUrl", input.ctaUrl);
  }
  formData.append("isActive", String(input.isActive));
  return api.postForm<Announcement>("/admin/announcements", formData);
}

export function setAnnouncementActive(id: string, isActive: boolean): Promise<void> {
  return api.post<void>(`/admin/announcements/${id}/${isActive ? "activate" : "deactivate"}`);
}

export function deleteAnnouncement(id: string): Promise<void> {
  return api.del<void>(`/admin/announcements/${id}`);
}
