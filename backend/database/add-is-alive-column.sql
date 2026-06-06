-- Run once against your app database (e.g. my-family):
--   psql -U postgres -d my-family -f backend/database/add-is-alive-column.sql

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS is_alive VARCHAR(3) DEFAULT 'Yes';

UPDATE family_members SET is_alive = 'No' WHERE date_of_death IS NOT NULL;
UPDATE family_members SET is_alive = 'Yes' WHERE date_of_death IS NULL;

ALTER TABLE family_members
  ALTER COLUMN is_alive SET NOT NULL;

ALTER TABLE family_members
  DROP CONSTRAINT IF EXISTS family_members_is_alive_check;

ALTER TABLE family_members
  ADD CONSTRAINT family_members_is_alive_check CHECK (is_alive IN ('Yes', 'No'));
