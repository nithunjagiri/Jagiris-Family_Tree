-- Email OTP for password reset (run once)
CREATE TABLE IF NOT EXISTS password_reset_otp (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts_remaining SMALLINT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otp_user_id ON password_reset_otp(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_otp_expires ON password_reset_otp(expires_at);
