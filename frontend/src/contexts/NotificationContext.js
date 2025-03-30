import React, { createContext, useState, useContext } from 'react';
import { Alert, Snackbar } from '@mui/material';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info', // 'error', 'warning', 'info', 'success'
  });

  /**
   * Show success notification
   * @param {string} message - The message to display
   */
  const showSuccess = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'success',
    });
  };

  /**
   * Show error notification
   * @param {string} message - The message to display
   */
  const showError = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'error',
    });
  };

  /**
   * Show warning notification
   * @param {string} message - The message to display
   */
  const showWarning = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'warning',
    });
  };

  /**
   * Show info notification
   * @param {string} message - The message to display
   */
  const showInfo = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'info',
    });
  };

  /**
   * Close the notification
   */
  const closeNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={closeNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};