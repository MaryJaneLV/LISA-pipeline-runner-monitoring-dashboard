import React, { createContext, useState, useContext, useEffect } from 'react';
import jwt_decode from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          // Verify token is valid
          const decoded = jwt_decode(storedToken);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token expired
            logout();
          } else {
            // Set token in API headers
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            
            // Get current user
            try {
              const { data } = await api.get('/api/auth/me');
              setUser(data.user);
              setIsAuthenticated(true);
            } catch (error) {
              console.error('Error fetching user:', error);
              logout();
            }
          }
        } catch (error) {
          console.error('Error decoding token:', error);
          logout();
        }
      }
      
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Login result
   */
  const login = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      // Set token in state and API headers
      setToken(data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      // Set user and auth state
      setUser(data.user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'An error occurred during login'
      };
    }
  };

  /**
   * Register user
   * @param {string} name - User name
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Registration result
   */
  const register = async (name, email, password) => {
    try {
      const { data } = await api.post('/api/auth/register', {
        name,
        email,
        password
      });
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      // Set token in state and API headers
      setToken(data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      // Set user and auth state
      setUser(data.user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'An error occurred during registration'
      };
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Clear auth state
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    // Remove token from API headers
    delete api.defaults.headers.common['Authorization'];
  };

  /**
   * Update user profile
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - Update result
   */
  const updateProfile = async (userData) => {
    try {
      const { data } = await api.put('/api/auth/profile', userData);
      
      // Update user in state
      setUser(data.user);
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'An error occurred while updating profile'
      };
    }
  };

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Change password result
   */
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'An error occurred while changing password'
      };
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};