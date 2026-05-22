-- Add youtube_titles column to songs table
ALTER TABLE songs ADD COLUMN IF NOT EXISTS youtube_titles text[] DEFAULT NULL;

-- Backfill with default titles (same count as youtube_links)
UPDATE songs
SET youtube_titles = ARRAY_FILL('전체'::text, ARRAY[array_length(youtube_links, 1)])
WHERE youtube_links IS NOT NULL;
