import React, { createContext, useState, useContext } from 'react';
import { Alert, Snackbar } from '@mui/material';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });


  const showSuccess = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'success',
    });
  };

  const showError = (message) => {
    let displayMessage = message;
    
    // Handle error objects with formatted messages from the API interceptor
    if (message && typeof message === 'object') {
      if (message.formattedMessage) {
        displayMessage = message.formattedMessage;
      } else if (message.response?.data?.message) {
        displayMessage = message.response.data.message;
      } else if (message.message) {
        displayMessage = message.message;
      }
    }
    
    setNotification({
      open: true,
      message: displayMessage,
      severity: 'error',
    });
  };

  const showWarning = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'warning',
    });
  };

  const showInfo = (message) => {
    setNotification({
      open: true,
      message,
      severity: 'info',
    });
  };

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