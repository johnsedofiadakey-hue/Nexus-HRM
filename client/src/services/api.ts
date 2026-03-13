import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const storeSession = (payload: { token: string; refreshToken?: string; user?: unknown }) => {
  localStorage.setItem('nexus_token', payload.token);
  if (payload.refreshToken) localStorage.setItem('nexus_refresh_token', payload.refreshToken);
  if (payload.user) localStorage.setItem('nexus_user', JSON.stringify(payload.user));
};

const clearSession = () => {
  localStorage.removeItem('nexus_token');
  localStorage.removeItem('nexus_refresh_token');
  localStorage.removeItem('nexus_user');
};

const flushRefreshQueue = (token: string | null) => {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean });

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem('nexus_refresh_token');
      if (!refreshToken) {
        clearSession();
        window.location.href = '/';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers || {};
            (originalRequest.headers as any)['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        storeSession(data);
        flushRefreshQueue(data.token);
        originalRequest.headers = originalRequest.headers || {};
        (originalRequest.headers as any)['Authorization'] = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        flushRefreshQueue(null);
        clearSession();
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 402) {
      window.location.href = '/billing-lock';
    }

    return Promise.reject(error);
  }
);

export default api;
