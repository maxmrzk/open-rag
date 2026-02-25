// ============================================================
// API Client — Pre-provisioned for future backend integration
// ============================================================

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...config?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: config?.signal,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>("GET", url, undefined, config);
  }

  async post<T>(url: string, body: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>("POST", url, body, config);
  }

  async put<T>(url: string, body: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>("PUT", url, body, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>("DELETE", url, undefined, config);
  }
}

export const apiClient = new ApiClient(BASE_URL);
