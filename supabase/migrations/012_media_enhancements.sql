-- Add enhanced media support columns to media_assets
-- Supports: tags, image variants (WebP/resized), dimensions, file size

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';

-- Index for tag-based queries
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category);
