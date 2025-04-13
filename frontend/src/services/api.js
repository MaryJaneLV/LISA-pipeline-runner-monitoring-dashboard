import axios from 'axios';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle auth errors (401, 403)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // If not already on login page, redirect
      if (!window.location.pathname.includes('/login')) {
        // Clear token
        localStorage.removeItem('token');
        
        // Redirect to login
        window.location.href = '/login';
      }
    }
    
    if (error.response) {
      error.formattedMessage = error.response.data?.message || 
                               error.response.data?.error || 
                               `Server error: ${error.response.status} ${error.response.statusText}`;
      
      if (error.response.data?.errors) {
        error.formattedMessage += ' - ' + Object.values(error.response.data.errors).join(', ');
      }
      
      if (process.env.NODE_ENV === 'development' || true) { // Always show details since users are trusted
        error.formattedMessage += error.response.data?.stack ? 
          `\n\nTechnical details: ${error.response.data.stack}` : '';
      }
    } else if (error.request) {
      error.formattedMessage = 'Network error: No response from server. Please check your connection.';
    } else {
      error.formattedMessage = `Request error: ${error.message}`;
    }
    
    return Promise.reject(error);
  }
);

export default api;