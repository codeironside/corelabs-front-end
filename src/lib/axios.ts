import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { config } from '@/config';
import { useAuthStore } from '@/store/authStore';

function createClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const studioClient: AxiosInstance = createClient(config.studioApiUrl);

/** Default export matches Content Studio API client imports. */
const apiClient: AxiosInstance = studioClient;
export default apiClient;

function isAuthSessionRequest(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/refresh')
    || url.includes('/auth/google')
    || url.includes('/auth/complete-signup')
  );
}

function attachBearer(client: AxiosInstance): void {
  client.interceptors.request.use((requestConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (isAuthSessionRequest(requestConfig.url)) {
      return requestConfig;
    }
    const token = useAuthStore.getState().accessToken;
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
  });
}

attachBearer(studioClient);

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) {
    logout();
    return null;
  }

  try {
    const { data } = await studioClient.post<{
      success: boolean;
      data: { accessToken: string; refreshToken: string };
    }>('/auth/refresh', { refreshToken });

    const nextAccess = data.data.accessToken;
    const nextRefresh = data.data.refreshToken;
    setTokens(nextAccess, nextRefresh);
    return nextAccess;
  } catch {
    logout();
    return null;
  }
}

type RetryableRequestConfig = InternalAxiosRequestConfig & { __retried?: boolean };

studioClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      throw error;
    }

    const original = error.config as RetryableRequestConfig | undefined;
    if (!original || original.__retried || isAuthSessionRequest(original.url)) {
      useAuthStore.getState().logout();
      throw error;
    }

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const nextToken = await refreshPromise;
    if (!nextToken) {
      throw error;
    }

    original.__retried = true;
    original.headers.Authorization = `Bearer ${nextToken}`;
    return studioClient.request(original);
  },
);
