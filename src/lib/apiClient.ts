import type { ProblemDetails } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

if (!BASE_URL) {
  // Fails loudly at import time rather than producing confusing "Failed to fetch" errors later.
  throw new Error("VITE_API_BASE_URL is not set - copy .env.example to .env.local.");
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

let accessToken: string | null = null;

/** Called by AuthProvider on login/logout/refresh - kept out of React state so every apiClient call always sees the latest token without needing to thread it through every call site. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  // FormData bodies (file uploads) must NOT get an explicit Content-Type - the browser sets its
  // own multipart boundary automatically, and overriding it here would break parsing server-side.
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("json") ? await response.json() : undefined;

  if (!response.ok) {
    const problem = body as ProblemDetails | undefined;
    throw new ApiError(
      response.status,
      problem?.detail ?? problem?.title ?? response.statusText ?? "Request failed",
      problem?.title,
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  /** For file uploads (multipart/form-data) - pass a FormData body, e.g. staff KYC documents. */
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
  putForm: <T>(path: string, formData: FormData) => request<T>(path, { method: "PUT", body: formData }),
};
