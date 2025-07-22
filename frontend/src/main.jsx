import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Global error handlers to prevent uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Prevent the default behavior (logging to console)
  event.preventDefault();
  
  // Only log in development mode
  if (import.meta.env.DEV) {
    console.warn('Unhandled promise rejection:', event.reason);
  }
});

window.addEventListener('error', (event) => {
  // Handle general errors
  if (import.meta.env.DEV) {
    console.warn('Global error:', event.error);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
