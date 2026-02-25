/**
 * CSRF Token Manager
 *
 * Handles CSRF token lifecycle for protecting state-changing requests.
 * Uses double-submit cookie pattern:
 * 1. Server sets httpOnly cookie with CSRF token
 * 2. Client stores token value in memory
 * 3. Client sends token in x-csrf-token header on POST/PUT/DELETE/PATCH
 */

let csrfToken: string | null = null;

/**
 * Fetches CSRF token from server and stores it in memory
 * Should be called on app initialization
 */
export async function fetchCsrfToken(apiUrl: string): Promise<string | null> {
    try {
        console.log('[CSRF] Fetching token from:', `${apiUrl}/csrf-token`);
        const response = await fetch(`${apiUrl}/csrf-token`, {
            method: 'GET',
            credentials: 'include', // Include cookies
        });

        if (response.ok) {
            const data = await response.json();
            csrfToken = data.csrfToken;
            console.log('[CSRF] Token fetched successfully:', csrfToken ? csrfToken.substring(0, 20) + '...' : 'null');
            return csrfToken;
        } else {
            console.error('[CSRF] Failed to fetch token:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error('[CSRF] Error fetching token:', error);
        return null;
    }
}

/**
 * Gets the current CSRF token
 */
export function getCsrfToken(): string | null {
    console.log('[CSRF] getCsrfToken called, token:', csrfToken ? 'present' : 'null');
    return csrfToken;
}

/**
 * Clears the CSRF token (e.g., on logout)
 */
export function clearCsrfToken(): void {
    csrfToken = null;
}

/**
 * Checks if a request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
    const upperMethod = method.toUpperCase();
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod);
}
