const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL);

function normalizeApiBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}
