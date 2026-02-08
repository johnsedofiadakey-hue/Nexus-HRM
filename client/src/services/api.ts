import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // This proxies through Vite to port 5000
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

// --- THE BOUNCER (Handle 401 Unauthorized) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server says "401 Unauthorized" (Token expired or fake)
    if (error.response && error.response.status === 401) {
      // Clear the invalid token
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      
      // Send them back to login
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);

export default api;