-- song_files 테이블에 악보 파트 레이블 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

ALTER TABLE public.song_files ADD COLUMN IF NOT EXISTS label text DEFAULT '전체';
