import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor for JWT auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('casco_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor for user-friendly error formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let customMessage = 'An unexpected error occurred. Please try again.';
    if (error.response) {
      if (error.response.status === 401) {
        customMessage = 'Session expired or unauthorized. Please log in again.';
        localStorage.removeItem('casco_token');
        localStorage.removeItem('casco_user');
      } else if (error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          customMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          customMessage = error.response.data.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] + ': ' : ''}${d.msg}`).join(', ');
        } else {
          customMessage = JSON.stringify(error.response.data.detail);
        }
      }
    } else if (error.request) {
      customMessage = 'Unable to connect to CASCO IT Portal server. Displaying cached data.';
    }
    return Promise.reject({ ...error, userMessage: customMessage });
  }
);

export default api;
