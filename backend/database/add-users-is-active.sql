-- Account status for admin user management (run once)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
