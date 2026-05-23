-- song_reactions 테이블
CREATE TABLE IF NOT EXISTS song_reactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     UUID        NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (song_id, user_id, emoji)  -- 같은 이모지는 한 번만
);

CREATE INDEX IF NOT EXISTS idx_song_reactions_song_id ON song_reactions(song_id);

ALTER TABLE song_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "song_reactions_select" ON song_reactions
  FOR SELECT USING (true);

CREATE POLICY "song_reactions_insert" ON song_reactions
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "song_reactions_delete" ON song_reactions
  FOR DELETE USING (
    user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1)
  );
