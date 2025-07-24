import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NovelProvider } from './context/NovelContext';
import ErrorBoundary, { AsyncErrorBoundary } from './components/ErrorBoundary';
import Header from './components/Header';
import NovelGenerationForm from './components/NovelGenerationForm';
import GenerationProgress from './components/GenerationProgress';
import NovelPreview from './components/NovelPreview';
import MonitoringDashboard from './components/MonitoringDashboard';
import './components/ErrorBoundary.css';

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior (logging to console)
  event.preventDefault();
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

function App() {
  return (
    <ErrorBoundary level="app">
      <AsyncErrorBoundary>
        <Router>
          <ErrorBoundary level="page" fallback={(error, retry) => (
            <div className="error-boundary">
              <div className="error-boundary-container">
                <div className="error-boundary-content">
                  <h2>Navigation Error</h2>
                  <p>There was a problem loading the page. Please try refreshing.</p>
                  <div className="error-actions">
                    <button className="btn btn-primary" onClick={retry}>
                      Try Again
                    </button>
                    <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                      Go Home
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}>
            <NovelProvider>
              <div className="app">
                <ErrorBoundary level="component" fallback={(error, retry) => (
                  <div className="error-boundary" style={{ minHeight: '80px' }}>
                    <div className="error-boundary-container">
                      <div className="error-boundary-content">
                        <h3>Header Error</h3>
                        <p>The navigation header failed to load.</p>
                        <button className="btn btn-primary" onClick={retry}>Retry</button>
                      </div>
                    </div>
                  </div>
                )}>
                  <Header />
                </ErrorBoundary>
                
                <main className="container">
                  <ErrorBoundary level="page" fallback={(error, retry) => (
                    <div className="error-boundary">
                      <div className="error-boundary-container">
                        <div className="error-boundary-content">
                          <h2>Page Error</h2>
                          <p>This page encountered an error and couldn't load properly.</p>
                          <div className="error-actions">
                            <button className="btn btn-primary" onClick={retry}>
                              Try Again
                            </button>
                            <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                              Go Home
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}>
                    <Routes>
                      <Route path="/" element={
                        <ErrorBoundary level="component">
                          <NovelGenerationForm />
                        </ErrorBoundary>
                      } />
                      <Route path="/progress/:jobId" element={
                        <ErrorBoundary level="component">
                          <GenerationProgress />
                        </ErrorBoundary>
                      } />
                      <Route path="/preview/:jobId" element={
                        <ErrorBoundary level="component">
                          <NovelPreview />
                        </ErrorBoundary>
                      } />
                      <Route path="/monitor/:jobId" element={
                        <ErrorBoundary level="component">
                          <MonitoringDashboard />
                        </ErrorBoundary>
                      } />
                    </Routes>
                  </ErrorBoundary>
                </main>
              </div>
            </NovelProvider>
          </ErrorBoundary>
        </Router>
      </AsyncErrorBoundary>
    </ErrorBoundary>
  );
}

export default App;
