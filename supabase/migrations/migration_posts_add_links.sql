-- posts 테이블에 투표/특송 연결 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS vote_id  UUID     REFERENCES votes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS song_ids UUID[]   NOT NULL DEFAULT '{}';
