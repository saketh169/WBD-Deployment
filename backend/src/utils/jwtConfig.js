/**
 * Centralized JWT & auth configuration.
 * Every file that needs JWT_SECRET or ADMIN_SIGNIN_KEY must import from here.
 * This guarantees a single source of truth and fails fast if secrets are missing.
 */

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_SIGNIN_KEY = process.env.ADMIN_SIGNIN_KEY;

// Fail fast in production if secrets are missing
if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
  }
  if (!ADMIN_SIGNIN_KEY) {
    throw new Error('FATAL: ADMIN_SIGNIN_KEY environment variable is not set. Server cannot start.');
  }
}

// In development, warn loudly but allow startup with fallback
if (!JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set — using insecure development fallback. Never do this in production!');
}
if (!ADMIN_SIGNIN_KEY) {
  console.warn('⚠️  WARNING: ADMIN_SIGNIN_KEY not set — using insecure development fallback.');
}

module.exports = {
  JWT_SECRET: JWT_SECRET || 'dev-only-fallback-change-me',
  ADMIN_SIGNIN_KEY: ADMIN_SIGNIN_KEY || 'dev-only-admin-key-change-me',
};
