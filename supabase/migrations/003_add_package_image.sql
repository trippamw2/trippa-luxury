-- Add image column to packages table
ALTER TABLE packages ADD COLUMN IF NOT EXISTS image TEXT;

-- Add properties column to packages table (for property references)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '[]';
