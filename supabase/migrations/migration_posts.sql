-- posts 테이블
CREATE TABLE IF NOT EXISTS posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  is_notice  BOOLEAN     NOT NULL DEFAULT false,
  created_by UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND is_executive = true)
);
CREATE POLICY "posts_update" ON posts FOR UPDATE
  USING  (EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND is_executive = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND is_executive = true));
CREATE POLICY "posts_delete" ON posts FOR DELETE
  USING  (EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND is_executive = true));

-- post_comments 테이블
CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_comments_select" ON post_comments FOR SELECT USING (true);
CREATE POLICY "post_comments_insert" ON post_comments FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1)
);
CREATE POLICY "post_comments_update" ON post_comments FOR UPDATE
  USING (user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1));
CREATE POLICY "post_comments_delete" ON post_comments FOR DELETE USING (
  user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1)
  OR (SELECT is_executive FROM profiles WHERE auth_id = auth.uid() LIMIT 1) = true
);

-- post_reads 테이블 (읽음 추적)
CREATE TABLE IF NOT EXISTS post_reads (
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reads_user_id ON post_reads(user_id);

ALTER TABLE post_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_reads_select" ON post_reads FOR SELECT
  USING (user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1));
CREATE POLICY "post_reads_insert" ON post_reads FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1)
);
