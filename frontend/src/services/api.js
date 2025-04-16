import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:30083',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        
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
      
      if (process.env.NODE_ENV === 'development' || true) { 
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