// ErrorBoundary.jsx - Production-ready React error boundary with comprehensive error handling
import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // Log to external service in production
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    try {
      // In production, send to error tracking service (e.g., Sentry, LogRocket)
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.props.userId || 'anonymous',
        sessionId: this.state.errorId,
        retryCount: this.state.retryCount,
        errorBoundaryLevel: this.props.level || 'app'
      };

      // Send to backend error logging endpoint
      if (window.fetch && process.env.NODE_ENV === 'production') {
        fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorReport)
        }).catch(err => {
          console.error('Failed to log error to service:', err);
        });
      }

      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Error Boundary Report');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Error Report:', errorReport);
        console.groupEnd();
      }
    } catch (loggingError) {
      console.error('Error logging failed:', loggingError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI based on error boundary level
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-boundary-content">
              <div className="error-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="#ef4444" strokeWidth="2"/>
                  <point x="12" y="16" fill="#ef4444"/>
                </svg>
              </div>
              
              <h2 className="error-title">
                {this.props.level === 'page' ? 'Page Error' : 'Something went wrong'}
              </h2>
              
              <p className="error-message">
                {this.props.level === 'component' 
                  ? 'A component failed to load properly.'
                  : 'We encountered an unexpected error. Please try again.'
                }
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="error-details">
                  <summary>Error Details (Development)</summary>
                  <div className="error-stack">
                    <h4>Error Message:</h4>
                    <pre>{this.state.error.message}</pre>
                    
                    <h4>Stack Trace:</h4>
                    <pre>{this.state.error.stack}</pre>
                    
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <h4>Component Stack:</h4>
                        <pre>{this.state.errorInfo.componentStack}</pre>
                      </>
                    )}
                  </div>
                </details>
              )}

              <div className="error-actions">
                {this.state.retryCount < 3 && (
                  <button 
                    className="btn btn-primary"
                    onClick={this.handleRetry}
                  >
                    Try Again
                  </button>
                )}
                
                <button 
                  className="btn btn-secondary"
                  onClick={this.handleReload}
                >
                  Reload Page
                </button>
                
                {this.props.onError && (
                  <button 
                    className="btn btn-outline"
                    onClick={() => this.props.onError(this.state.error, this.state.errorInfo)}
                  >
                    Report Issue
                  </button>
                )}
              </div>

              {this.state.errorId && (
                <div className="error-id">
                  <small>Error ID: {this.state.errorId}</small>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default props without PropTypes
ErrorBoundary.defaultProps = {
  level: 'app'
};

// Higher-order component for easy wrapping
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for manually triggering error boundaries
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);
  
  const handleError = React.useCallback((error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return handleError;
};

// Async error boundary for handling promise rejections
export class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Async Error Boundary caught an error:', error, errorInfo);
  }

  componentDidMount() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event) => {
    this.setState({
      hasError: true,
      error: new Error(`Unhandled promise rejection: ${event.reason}`)
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundary level="async" fallback={this.props.fallback}>
          <div>Async operation failed</div>
        </ErrorBoundary>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
