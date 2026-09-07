import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8057';
  

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

class AuthInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthInvalidError';
  }
}

/**
 * A request is a genuine "network problem" (offline, DNS failure, timeout,
 * CORS preflight failure, server unreachable) when axios could not complete
 * it and therefore never received an HTTP response at all.
 *
 * A request that DID get a response — even a 401/403 — is a real answer
 * from the backend and must be handled as an auth decision, not a
 * connectivity problem.
 *
 * This distinction is the crux of the whole fix: only the second category
 * may ever invalidate a session.
 */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  // axios sets `error.response` only when the server actually answered.
  // No response + no explicit cancellation = connectivity problem.
  return !error.response && error.code !== 'ERR_CANCELED';
}

/**
 * True only for a confirmed, backend-issued authentication/authorization
 * rejection (401 or 403 with an actual HTTP response). This is the ONLY
 * category of error that may ever clear the session or redirect to login.
 *
 * Explicitly NOT included: network errors (see isNetworkError), and server
 * errors (5xx) — a 500/502/503 means the backend is having a bad moment,
 * not that the user is unauthenticated. Treating a 500 as an auth failure
 * would incorrectly log people out during a backend outage or deploy.
 */
export function isAuthError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return !!error.response && [401, 403].includes(error.response.status);
}

/**
 * True for a transient server-side problem (5xx) or a network problem —
 * i.e. anything that is NOT a definitive auth rejection and NOT a
 * definitive client error (4xx other than 401/403, which represent a bad
 * request rather than something worth retrying). Used to decide what's
 * safe to retry.
 */
export function isTransientError(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return typeof status === 'number' && status >= 500;
}

// ─── Request interceptor: attach access token from the store ───
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: refresh on 401, never on network errors ───
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // ── Network-level failure: offline, timeout, DNS, server unreachable ──
    // Per spec: this must NEVER invalidate the session. Let the caller
    // (React Query, form handlers, etc.) handle it as a transient error —
    // auth state stays exactly as it was.
    if (isNetworkError(error)) {
      return Promise.reject(error);
    }

    // No config to retry (e.g. request was cancelled) — nothing more to do.
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // A refresh is already in flight — queue this request behind it
        // instead of firing a second, competing refresh call.
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((queueError) => Promise.reject(queueError));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
          // No refresh token to try — this genuinely is "not logged in."
          throw new AuthInvalidError('No refresh token available');
        }

        const { data } = await axios.post(
          `${BASE_URL}/api/v1/auth/tokens/refresh`,
          { refreshToken },
          { timeout: 15000 }
        );

        const newAccessToken = data.data.accessToken as string;
        const newRefreshToken = data.data.refreshToken as string | undefined;

        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // A refresh attempt can fail for two very different reasons:
        //  1. The network dropped mid-refresh (no response reached us) —
        //     this must NOT log the user out.
        //  2. The backend answered and rejected the refresh token (401/403,
        //     or our own AuthInvalidError for "no token to send") — this
        //     IS a genuine, terminal auth failure.
        processQueue(refreshError, null);

        const backendRejected =
          refreshError instanceof AuthInvalidError ||
          (axios.isAxiosError(refreshError) &&
            !!refreshError.response &&
            [401, 403].includes(refreshError.response.status));

        if (backendRejected) {
          useAuthStore.getState().clearAuth();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:session-expired'));
          }
        }
        // else: network/timeout during refresh — leave auth state untouched.
        // The next successful request (often triggered automatically on
        // reconnect, see useNetworkStatus) will retry and recover silently.

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 from the backend after a request already carried a valid-looking
    // token is a genuine authorization decision (wrong role, blocked user,
    // etc.), not a connectivity issue — let callers handle it via the
    // response, no forced logout here. Only an explicit refresh rejection
    // (above) or a 401 that survives retry should ever clear the session.
    return Promise.reject(error);
  }
);

export default apiClient;
