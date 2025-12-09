/**
 * Centralized API Base URL Configuration
 * 
 * Uses VITE_API_URL environment variable with defensive fallbacks.
 * Always use this instead of hardcoding localhost URLs.
 * 
 * Usage:
 *   import { API_BASE, getApiUrl } from '@/utils/apiBase';
 *   
 *   // Simple usage
 *   fetch(`${API_BASE}/api/menu`);
 *   
 *   // With helper
 *   fetch(getApiUrl('/api/menu?table=5'));
 */

// Extract and validate API base URL from environment
export const API_BASE = (() => {
  const env = import.meta.env.VITE_API_URL || '';
  const base = String(env).trim().replace(/\/$/, ''); // Remove trailing slash
  
  if (!base) {
    console.warn(
      '[MenuAI] ⚠️ VITE_API_URL is not set. ' +
      'Using relative /api/ endpoints. ' +
      'Set VITE_API_URL in your environment for production.'
    );
    return ''; // Return empty string for relative URLs
  }
  
  console.log('[MenuAI] ✅ API Base URL configured:', base);
  return base;
})();

/**
 * Helper to build full API URLs with logging
 * @param {string} endpoint - API endpoint path (e.g., '/api/menu')
 * @param {Object} params - Optional query parameters
 * @returns {string} Full API URL
 */
export function getApiUrl(endpoint, params = {}) {
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Build query string
  const queryString = Object.keys(params)
    .filter(key => params[key] != null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const url = API_BASE 
    ? `${API_BASE}${path}${queryString ? '?' + queryString : ''}`
    : `${path}${queryString ? '?' + queryString : ''}`;
  
  console.log('[MenuAI] 🌐 API URL:', url);
  return url;
}

/**
 * Enhanced fetch wrapper with logging and error handling
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise} Fetch promise
 */
export async function apiFetch(endpoint, options = {}) {
  const url = typeof endpoint === 'string' ? getApiUrl(endpoint) : endpoint;
  
  console.log('[MenuAI] 📡 Request:', {
    url,
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body ? (typeof options.body === 'string' ? options.body.substring(0, 200) : '[object]') : null
  });
  
  try {
    const response = await fetch(url, options);
    
    console.log('[MenuAI] 📥 Response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('[MenuAI] ✅ Data received:', 
      JSON.stringify(data).substring(0, 1000) + (JSON.stringify(data).length > 1000 ? '...' : '')
    );
    
    return data;
  } catch (error) {
    console.error('[MenuAI] ❌ API Error:', {
      url,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Export for backward compatibility
export const API_URL = API_BASE ? `${API_BASE}/api` : '/api';
export const API_BASE_URL = API_BASE;

// Log initialization
console.log('[MenuAI] 🚀 API Configuration initialized', {
  API_BASE,
  API_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL || '(not set)'
});
