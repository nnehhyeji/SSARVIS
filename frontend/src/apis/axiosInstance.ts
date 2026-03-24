import axios from 'axios';
import { getApiHttpBaseUrl } from '../config/api';
import { PATHS } from '../routes/paths';
import { useUserStore } from '../store/useUserStore';
import { useVoiceLockStore } from '../store/useVoiceLockStore';

const axiosInstance = axios.create({
  baseURL: getApiHttpBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

const clearAuthState = () => {
  useUserStore.getState().clearUserData();
};

const redirectToLoginIfNeeded = () => {
  if (typeof window === 'undefined') return;

  const currentPath = window.location.pathname;
  if (currentPath === PATHS.LOGIN || currentPath === PATHS.SIGNUP) return;

  window.location.replace(PATHS.LOGIN);
};

const reissueAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${getApiHttpBaseUrl()}/auth/reissue`, {}, { withCredentials: true })
      .then((response) => {
        const newAccessToken = (
          response.headers['authorization']?.substring(7) || response.data?.data?.accessToken
        )?.trim();

        if (!newAccessToken) {
          return null;
        }

        localStorage.setItem('token', newAccessToken);

        const timeout = response.data?.data?.timeout;
        if (timeout) {
          useVoiceLockStore.getState().setTimeoutDuration(timeout);
        }

        return newAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

axiosInstance.interceptors.request.use(
  (config) => {
    const skipTokenPaths = ['/auth/login', '/users/check-email', '/users/check-nickname'];
    const isPublicPath = skipTokenPaths.some(
      (path) => config.url === path || config.url?.includes(path),
    );
    const isSignupPath = config.url === '/users' && config.method === 'post';

    if (!isPublicPath && !isSignupPath) {
      const token = localStorage.getItem('token');
      if (token && token !== 'mock_token_for_testing') {
        config.headers.Authorization = `Bearer ${token.trim()}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => {
    const authHeader = response.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      localStorage.setItem('token', token);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const skipReissuePaths = [
      '/auth/login',
      '/auth/reissue',
      '/users/check-email',
      '/users/check-nickname',
    ];
    const isSkipReissue = skipReissuePaths.some(
      (path) => originalRequest.url === path || originalRequest.url?.includes(path),
    );
    const isSignupPath = originalRequest.url === '/users' && originalRequest.method === 'post';

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isSkipReissue &&
      !isSignupPath
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await reissueAccessToken();

        if (newAccessToken) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken.trim()}`;
          return axiosInstance(originalRequest);
        }
      } catch (reissueError) {
        clearAuthState();
        redirectToLoginIfNeeded();
        return Promise.reject(reissueError);
      }

      clearAuthState();
      redirectToLoginIfNeeded();
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
