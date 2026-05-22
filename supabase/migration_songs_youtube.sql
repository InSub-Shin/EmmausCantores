-- 특송에 유튜브 링크 여러 개 지원
ALTER TABLE songs ADD COLUMN IF NOT EXISTS youtube_links text[] DEFAULT '{}';

-- 기존 youtube_url 값이 있으면 youtube_links에 복사 (기존 데이터 마이그레이션)
UPDATE songs
SET youtube_links = ARRAY[youtube_url]
WHERE youtube_url IS NOT NULL AND (youtube_links IS NULL OR array_length(youtube_links, 1) IS NULL);
