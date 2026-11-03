// Central configuration for API and WebSocket endpoints

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// API Base URL
// In local dev with Vite proxy, use relative URL (empty string).
// In production, use the ngrok tunnel that exposes the backend.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ''
  ? import.meta.env.VITE_API_BASE_URL
  : (isLocal ? '' : 'https://noneloquently-phyllotactical-roy.ngrok-free.dev');

// WebSocket Base URL
// Local: ws(s)://current-host
// Production: wss://api-kahoot.anasxonummataliy.dev
const localWsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const localWsHost = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';

export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL !== undefined && import.meta.env.VITE_WS_BASE_URL !== ''
  ? import.meta.env.VITE_WS_BASE_URL
  : (isLocal ? `${localWsProtocol}//${localWsHost}` : 'wss://api-kahoot.anasxonummataliy.dev');

/**
 * Builds full API URL from relative endpoint
 * @param {string} endpoint - e.g. '/api/quizzes/'
 * @returns {string}
 */
export const apiUrl = (endpoint) => {
  if (!endpoint) return '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${path}`;
};
