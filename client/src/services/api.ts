import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- THE INTERCEPTOR (The Automatic Badge Attacher) ---
api.interceptors.request.use(
  (config) => {
    // 1. Look for the token in the browser's safe
    const token = localStorage.getItem('nexus_token');

    // 2. If found, attach it to the request header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- THE BOUNCER (Handle 401 Unauthorized & 402 Billing Locks) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. If the server says "401 Unauthorized" (Token expired or fake)
    if (error.response && error.response.status === 401) {
      // Clear the invalid token
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');

      // Send them back to login
      window.location.href = '/';
    }

    // 2. If the server says "402 Payment Required" (SaaS Sub Expired)
    if (error.response && error.response.status === 402) {
      // Redirect to the billing lockout interface without destroying the session
      window.location.href = '/billing/lock';
    }

    return Promise.reject(error);
  }
);

export default api;