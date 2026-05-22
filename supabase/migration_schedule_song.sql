-- 일정에 특송 연결 (song_id)
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS song_id uuid REFERENCES songs(id) ON DELETE SET NULL;

-- 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_schedules_song_id ON schedules(song_id);
