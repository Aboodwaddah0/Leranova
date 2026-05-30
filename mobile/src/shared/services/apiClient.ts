import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { StorageService } from './storage';

/**
 * API base URL — change this to your server IP when running on a physical device.
 * localhost won't work on a physical device; use your LAN IP: 192.168.x.x:5000
 */
export const API_BASE_URL = 'http://192.168.88.12:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await StorageService.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let axios set Content-Type automatically for FormData
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// ── Response interceptor: normalise errors ───────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Request failed. Please try again.';

    // Auto-logout on 401
    if (status === 401) {
      await StorageService.clear();
    }

    const normalized = new Error(message) as Error & { status?: number };
    normalized.status = status;
    return Promise.reject(normalized);
  },
);

export default apiClient;

/** Unwrap the standard Learnova { success, data, ... } envelope */
export function unwrap<T>(response: { data: { data?: T } | T }): T {
  const d = response?.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

/** Ensure value is an array, checking common shape variants */
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    for (const key of ['items', 'rows', 'data', 'results']) {
      if (Array.isArray(v[key])) return v[key] as T[];
    }
  }
  return [];
}
