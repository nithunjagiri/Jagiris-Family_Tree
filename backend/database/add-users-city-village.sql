-- City / village for user profile & admin user list (run once)
ALTER TABLE users ADD COLUMN IF NOT EXISTS city_village VARCHAR(255);
