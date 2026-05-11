/**
 * api.ts — Central HTTP client with automatic JWT refresh.
 *
 * All screens should call `apiFetch(path, options)` instead of raw `fetch()`.
 * On a 401 response, it silently calls the refresh endpoint, rotates the token,
 * and retries the original request exactly once. If the retry also fails, it
 * forces a logout so the user is sent back to the login screen.
 */
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

type RequestOptions = RequestInit & {
  /** Skip the auto-retry logic (for auth endpoints themselves) */
  skipRefresh?: boolean;
};

export const apiFetch = async (
  path: string,
  options: RequestOptions = {}
): Promise<Response> => {
  const { token, refreshAccessToken, logout } = useAuthStore.getState();
  const { skipRefresh, ...fetchOptions } = options;

  // Attach the current access token
  const headers = new Headers(fetchOptions.headers || {});
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  // On 401, try refreshing once then retry
  if (response.status === 401 && !skipRefresh) {
    const newToken = await refreshAccessToken();

    if (!newToken) {
      // Refresh failed → session is dead, log out
      await logout();
      return response; // Return the 401 so callers can react
    }

    // Retry with the fresh token
    const retryHeaders = new Headers(fetchOptions.headers || {});
    retryHeaders.set('Content-Type', retryHeaders.get('Content-Type') || 'application/json');
    retryHeaders.set('Authorization', `Bearer ${newToken}`);

    return fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: retryHeaders,
    });
  }

  return response;
};

/** Convenience wrappers */
export const apiGet = (path: string, options?: RequestOptions) =>
  apiFetch(path, { method: 'GET', ...options });

export const apiPost = (path: string, body?: object, options?: RequestOptions) =>
  apiFetch(path, { method: 'POST', body: JSON.stringify(body), ...options });

export const apiPut = (path: string, body?: object, options?: RequestOptions) =>
  apiFetch(path, { method: 'PUT', body: JSON.stringify(body), ...options });

export const apiDelete = (path: string, options?: RequestOptions) =>
  apiFetch(path, { method: 'DELETE', ...options });
