import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Automatically bypass ngrok free tier interstitial for API requests
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  return originalFetch(input, { ...init, headers });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
