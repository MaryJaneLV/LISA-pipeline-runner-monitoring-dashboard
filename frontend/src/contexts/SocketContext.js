import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [workflowUpdates, setWorkflowUpdates] = useState([]);
  const { isAuthenticated, token } = useAuth();

  // Initialize socket connection when authenticated
  useEffect(() => {
    let socketInstance = null;

    // Only connect if user is authenticated
    if (isAuthenticated && token) {
      // Get base URL from environment or default
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      
      // Initialize socket with auth token
      socketInstance = io(baseURL, {
        auth: {
          token
        },
        transports: ['websocket']
      });

      // Socket event handlers
      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      socketInstance.on('workflow:status', (data) => {
        console.log('Workflow status update:', data);
        setWorkflowUpdates(prev => [data, ...prev].slice(0, 10)); // Keep last 10 updates
        
        // Trigger a custom event with the workflow data
        // This will allow components to listen for status updates for specific workflows
        if (data && data.metadata && data.metadata.name) {
          const customEvent = new CustomEvent('workflow:status:' + data.metadata.name, { 
            detail: data 
          });
          window.dispatchEvent(customEvent);
          
          // If we have the workflow data from the backend, dispatch another event with it
          if (data.workflowData) {
            const workflowEvent = new CustomEvent('workflow:updated', { 
              detail: data.workflowData 
            });
            window.dispatchEvent(workflowEvent);
          }
        }
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setConnected(false);
      });

      // Save socket instance
      setSocket(socketInstance);
    }

    // Cleanup on unmount or if auth state changes
    return () => {
      if (socketInstance) {
        console.log('Disconnecting socket');
        socketInstance.disconnect();
        setConnected(false);
      }
    };
  }, [isAuthenticated, token]);

  const value = {
    socket,
    connected,
    workflowUpdates
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};