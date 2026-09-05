/**
 * Shared JWT configuration. Production must set JWT_SECRET (no weak fallback).
 */
function resolveJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. Refusing to start with a weak default.'
    );
  }

  console.warn(
    '[security] JWT_SECRET is not set; using a development-only fallback. Set JWT_SECRET before production deploy.'
  );
  return 'dev-only-insecure-jwt-secret';
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

module.exports = { JWT_SECRET, JWT_EXPIRY, resolveJwtSecret };
