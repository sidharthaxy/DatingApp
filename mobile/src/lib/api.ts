/**
 * api.ts — Central HTTP client with automatic JWT refresh.
 *
 * All screens should call `apiFetch(path, options)` instead of raw `fetch()`.
 * On a 401 response, it silently calls the refresh endpoint, rotates the token,
 * and retries the original request exactly once. If the refresh token itself has been
 * rejected the auth store logs the user out, which sends them back to the login screen.
 */
import { useAuthStore } from '../store/authStore';
import { API_URL } from './config';

type RequestOptions = RequestInit & {
  /** Skip the auto-retry logic (for auth endpoints themselves) */
  skipRefresh?: boolean;
  /** Abort the request after this many milliseconds */
  timeoutMs?: number;
};

const isFormData = (body: unknown): boolean =>
  typeof FormData !== 'undefined' && body instanceof FormData;

const buildHeaders = (init: RequestInit, token: string | null) => {
  const headers = new Headers(init.headers || {});
  // multipart bodies must NOT get a Content-Type: the runtime adds its own with the boundary
  if (!isFormData(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs?: number) => {
  if (!timeoutMs) return fetch(url, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('The request timed out. Check your connection and try again.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

export const apiFetch = async (
  path: string,
  options: RequestOptions = {}
): Promise<Response> => {
  const { skipRefresh, timeoutMs, ...fetchOptions } = options;
  const url = `${API_URL}${path}`;

  const response = await fetchWithTimeout(
    url,
    { ...fetchOptions, headers: buildHeaders(fetchOptions, useAuthStore.getState().token) },
    timeoutMs
  );

  // On 401, try refreshing once then retry
  if (response.status === 401 && !skipRefresh) {
    const newToken = await useAuthStore.getState().refreshAccessToken();

    // No new token: either the session is dead (the store has already logged out) or the
    // network dropped. Either way hand the 401 back so callers can react.
    if (!newToken) return response;

    return fetchWithTimeout(url, { ...fetchOptions, headers: buildHeaders(fetchOptions, newToken) }, timeoutMs);
  }

  return response;
};

/** Convenience wrappers */
export const apiGet = (path: string, options?: RequestOptions) =>
  apiFetch(path, { method: 'GET', ...options });

export const apiPost = (path: string, body?: object, options?: RequestOptions) =>
  apiFetch(path, { method: 'POST', body: JSON.stringify(body ?? {}), ...options });

export const apiPut = (path: string, body?: object, options?: RequestOptions) =>
  apiFetch(path, { method: 'PUT', body: JSON.stringify(body ?? {}), ...options });

export const apiDelete = (path: string, options?: RequestOptions) =>
  apiFetch(path, { method: 'DELETE', ...options });

/** multipart/form-data upload (photos, KYC video, voice notes) */
export const apiUpload = (path: string, form: FormData, options?: RequestOptions) =>
  apiFetch(path, { method: 'POST', body: form, timeoutMs: 120000, ...options });

/** Thrown by `apiJson` for any non-success response; `message` is safe to show to the user. */
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Parses the API's `{ success, data, error }` envelope and THROWS on failure, so a rejected
 * request can never be mistaken for a successful one (onboarding used to ignore failures).
 */
export const apiJson = async <T = any>(request: Promise<Response>): Promise<T> => {
  let res: Response;
  try {
    res = await request;
  } catch (e: any) {
    throw new ApiError(
      e?.message?.includes('timed out') ? e.message : `Can't reach the server at ${API_URL}. Is the backend running?`,
      0,
      'NETWORK_ERROR'
    );
  }
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok || !json?.success) {
    const err = json?.error || {};
    const detail = Array.isArray(err.details) && err.details[0]?.message
      ? `${err.details[0].path?.join('.') || 'input'}: ${err.details[0].message}`
      : null;
    throw new ApiError(detail || err.message || `Request failed (${res.status})`, res.status, err.code, err.details);
  }
  return (json.data ?? json) as T;
};
