import { apiClient } from "./client";

// ============================================================
// Typed API Wrappers — Use these in hooks
// ============================================================

export const get = <T>(url: string) => apiClient.get<T>(url);
export const post = <T>(url: string, body: unknown) => apiClient.post<T>(url, body);
export const put = <T>(url: string, body: unknown) => apiClient.put<T>(url, body);
export const del = <T>(url: string) => apiClient.delete<T>(url);
