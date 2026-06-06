-- Add support for WhatsApp number and custom current city text.
-- Usage: psql -d my_family -f backend/database/add-whatsapp-and-residence-place.sql

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(32),
  ADD COLUMN IF NOT EXISTS residence_place VARCHAR(500);
