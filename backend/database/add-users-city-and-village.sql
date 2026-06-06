-- City and village on users (run once if you do not use server auto-ensure).
-- Server start also runs ALTER ... IF NOT EXISTS via ensurePlacesAuditSchema.js
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS village VARCHAR(255);
