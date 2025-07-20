import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNovel } from '../context/NovelContext';

export function useWebSocket(jobId) {
  const socket = useRef(null);
  const { dispatch } = useNovel();
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  useEffect(() => {
    if (!jobId) return;
    
    const connectSocket = () => {
      // Connect to WebSocket - use environment variable for local dev, current domain for production
      const socketURL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      socket.current = io(socketURL, {
        reconnectionAttempts: 5,
        timeout: 20000
      });
      
      socket.current.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        socket.current.emit('subscribe', jobId);
      });
      
      socket.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
        
        reconnectAttempts.current++;
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      });
      
      socket.current.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          socket.current.connect();
        }
      });
      
      // Handle job updates
      socket.current.on('job-update', (data) => {
        console.log('Received job update:', data);
        dispatch({ type: 'UPDATE_PROGRESS', payload: data });
        
        if (data.status === 'completed') {
          dispatch({ type: 'GENERATION_COMPLETE', payload: data });
        } else if (data.status === 'failed') {
          dispatch({ type: 'GENERATION_ERROR', payload: data.message || 'Generation failed' });
        }
      });
    };
    
    connectSocket();
    
    // Cleanup on unmount
    return () => {
      if (socket.current) {
        socket.current.emit('unsubscribe', jobId);
        socket.current.disconnect();
        setIsConnected(false);
      }
    };
  }, [jobId, dispatch]);
  
  return { socket: socket.current, isConnected };
}
