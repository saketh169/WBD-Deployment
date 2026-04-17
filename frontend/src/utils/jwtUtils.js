/**
 * Safely decode a JWT token payload without verification.
 * Handles base64url encoding and malformed tokens gracefully.
 * @param {string} token - JWT token string
 * @returns {object|null} Decoded payload or null if invalid
 */
export function decodeTokenPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64: replace URL-safe chars and add padding
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);

    const payload = JSON.parse(atob(base64));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired.
 * @param {string} token - JWT token string
 * @returns {boolean} True if expired or invalid
 */
export function isTokenExpired(token) {
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) return true;
  // exp is in seconds, Date.now() is in ms
  return Date.now() >= payload.exp * 1000;
}
