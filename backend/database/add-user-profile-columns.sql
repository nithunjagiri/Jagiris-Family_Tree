-- Optional profile fields for accounts (run once against your DB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
