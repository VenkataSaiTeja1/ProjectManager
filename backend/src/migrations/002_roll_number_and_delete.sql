-- Migration 002: Add roll_number and make email/phone optional
ALTER TABLE users ADD COLUMN IF NOT EXISTS roll_number VARCHAR(100);

-- Make email nullable
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Create unique index on roll_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_roll_number ON users(LOWER(TRIM(roll_number))) WHERE roll_number IS NOT NULL;

-- Ensure admin has roll_number = 'admin'
UPDATE users SET roll_number = 'admin' WHERE role = 'admin' AND (roll_number IS NULL OR roll_number = '');
