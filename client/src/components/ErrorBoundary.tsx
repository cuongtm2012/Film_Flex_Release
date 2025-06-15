import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 React Error Boundary Caught Error:', error);
    console.error('🚨 Error Info:', errorInfo);
    console.error('🚨 Component Stack:', errorInfo.componentStack);
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    });

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You can add error reporting service here
      console.error('Production error logged:', { error, errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          background: '#f5f5f5',
          minHeight: '100vh'
        }}>
          <h1 style={{ color: '#d32f2f' }}>Something went wrong</h1>
          <p>The application encountered an error. This might be causing the blank page issue.</p>
          
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Reload Page
            </button>
            
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              style={{
                background: '#d32f2f',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear Cache & Reload
            </button>
          </div>

          <details style={{ marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Technical Details (Click to expand)
            </summary>
            <div style={{
              background: '#fff',
              padding: '15px',
              border: '1px solid #ddd',
              marginTop: '10px',
              borderRadius: '4px'
            }}>
              <h3>Error Message:</h3>
              <pre style={{ color: '#d32f2f', whiteSpace: 'pre-wrap' }}>
                {this.state.error?.message}
              </pre>
              
              <h3>Stack Trace:</h3>
              <pre style={{ 
                fontSize: '12px', 
                overflow: 'auto', 
                maxHeight: '200px',
                whiteSpace: 'pre-wrap'
              }}>
                {this.state.error?.stack}
              </pre>
              
              {this.state.errorInfo && (
                <>
                  <h3>Component Stack:</h3>
                  <pre style={{ 
                    fontSize: '12px', 
                    overflow: 'auto', 
                    maxHeight: '200px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
export { ErrorBoundary };
