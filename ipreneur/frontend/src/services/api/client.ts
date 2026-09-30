import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  // Only treat literal `{}` objects as plain — reject built-ins like Blob,
  // ArrayBuffer, Date, Map, etc. so they pass through the camelizer untouched
  // (e.g. blob responses for file downloads must not be mangled into `{}`).
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function camelizeObject<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => camelizeObject(item)) as unknown as T;
  }

  if (isPlainObject(obj)) {
    return Object.entries(obj).reduce((acc, [key, val]) => {
      const camelKey = toCamelCase(key);
      acc[camelKey] = camelizeObject(val);
      return acc;
    }, {} as Record<string, unknown>) as T;
  }

  return obj;
}

/** Where the API lives.
 *
 *  Set VITE_API_URL at build time to the deployed backend, e.g.
 *  https://api.example.com/api/v1 — or to "/api/v1" if the frontend is served
 *  from the same origin as the API (or behind a host rewrite that proxies it).
 *
 *  The fallback differs by mode on purpose. In development, localhost:8000 is
 *  the right guess. In a production build it never is: "localhost" means the
 *  visitor's own machine, so an unset variable would point every user at their
 *  own computer and fail in a way that looks like the API is down. Production
 *  falls back to a same-origin relative path instead, which is at least correct
 *  when frontend and API share an origin, and says loudly that it is guessing.
 *
 *  .env.local is gitignored, so a CI build will not inherit a developer's
 *  value — this must be configured in the deploy environment.
 */
function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  if (import.meta.env.PROD) {
    // eslint-disable-next-line no-console
    console.error(
      "[iPreneur] VITE_API_URL was not set at build time. Falling back to the " +
        "same-origin path /api/v1. If the API is on another origin, set " +
        "VITE_API_URL in the deploy environment and rebuild."
    );
    return "/api/v1";
  }
  return "http://localhost:8000/api/v1";
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    if (res?.data && (Array.isArray(res.data) || isPlainObject(res.data))) {
      res.data = camelizeObject(res.data);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().clearAuth();
    return Promise.reject(err);
  }
);
