// export const SERVER_URL =  "https://2ecd-111-125-219-62.ngrok-free.app"
const configuredServerUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
export const SERVER_URL: string = configuredServerUrl || "http://127.0.0.1:5000";

const TOKEN_KEY = 'budgetiq_auth_token';

/**
 * Get the stored JWT token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store the JWT token
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the JWT token (for logout)
 */
export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Make an authenticated request to the backend with JWT token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const method = (options.method || 'GET').toUpperCase();
  const res = await fetch(url, {
    ...options,
    headers,
  });
  if (method === 'POST' && res.ok) {
    try {
      // Try to parse response body and include portfolioData in the event if present
      const detail: { url: string; portfolioData?: unknown } = { url };
      try {
        const cloned = res.clone();
        const body = await cloned.json();
        if (body && body.portfolioData) {
          detail.portfolioData = body.portfolioData;
        }
      } catch {
        // response body not JSON or already consumed
      }
      window.dispatchEvent(new CustomEvent('portfolioUpdated', { detail }));
    } catch {
      // ignore
    }
  }
  return res;
} 
 