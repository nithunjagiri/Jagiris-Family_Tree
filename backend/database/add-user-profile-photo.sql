-- Add profile_photo column to users table (run once against your DB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;
