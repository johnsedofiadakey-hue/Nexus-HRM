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
    
    // Prevent attaching expired token to refresh request
    if (config.url?.includes('/auth/refresh')) {
      if (token) {
        console.log('[API Interceptor] Stripping expired access token from refresh request');
        delete config.headers['Authorization'];
      }
      return config;
    }

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

    if (error.response?.status === 401 && !originalRequest?._retry && !originalRequest.url?.includes('/auth/refresh')) {
      const refreshToken = localStorage.getItem('nexus_refresh_token');
      
      console.warn(`[API Interceptor] 401 detected for: ${originalRequest.url}. Attempting refresh...`);

      if (!refreshToken) {
        console.error('[API Interceptor] No refresh token found. Redirecting to login.');
        clearSession();
        window.location.href = '/';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        console.log('[API Interceptor] Already refreshing. Queuing request:', originalRequest.url);
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
        console.log('[API Interceptor] Calling /auth/refresh...');
        const refreshUrl = `${api.defaults.baseURL}/auth/refresh`;
        const { data } = await axios.post(refreshUrl, { refreshToken });
        
        console.log('[API Interceptor] Refresh successful. New access token acquired.');
        storeSession(data);
        flushRefreshQueue(data.token);
        
        originalRequest.headers = originalRequest.headers || {};
        (originalRequest.headers as any)['Authorization'] = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        const errorData = refreshError.response?.data;
        console.error('[API Interceptor] Refresh FAILED:', {
          status: refreshError.response?.status,
          error: errorData?.error || errorData || refreshError.message
        });
        
        flushRefreshQueue(null);
        clearSession();
        
        if (window.location.pathname !== '/') {
           console.warn('[API Interceptor] Redirecting to login due to refresh failure.');
           window.location.href = '/';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 402) {
      console.warn('[API Interceptor] 402 Payment Required for:', originalRequest.url);
      window.location.href = '/billing-lock';
    }

    return Promise.reject(error);
  }
);

export default api;
