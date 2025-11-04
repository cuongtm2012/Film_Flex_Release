import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { logger } from "./lib/logger";

// Enhanced error handling for blank page debugging
window.addEventListener('error', (event) => {
  logger.error('🚨 Global Error:', event.error);
  logger.error('🚨 Error Details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('🚨 Unhandled Promise Rejection:', event.reason);
  logger.error('🚨 Rejection Details:', event);
});

// App initialization with error handling
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found - HTML may not be loading correctly');
  }
  
  logger.log('✅ Root element found, initializing React app...');
  const root = createRoot(rootElement);
  root.render(<App />);
  logger.log('✅ React app rendered successfully');
} catch (error) {
  logger.error('🚨 Fatal error during app initialization:', error);
  
  // Fallback error display
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; min-height: 100vh;">
        <h1 style="color: #d32f2f;">Application Error</h1>
        <p>The application failed to load. Please try:</p>
        <ul>
          <li>Refreshing the page</li>
          <li>Clearing your browser cache</li>
          <li>Opening developer tools (F12) to see detailed errors</li>
        </ul>
        <details style="margin-top: 20px;">
          <summary>Technical Details</summary>
          <pre style="background: #fff; padding: 10px; border: 1px solid #ddd; margin-top: 10px;">${error.message}</pre>
        </details>
      </div>
    `;
  }
}
