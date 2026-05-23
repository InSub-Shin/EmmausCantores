-- vote_comments 테이블
CREATE TABLE IF NOT EXISTS vote_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id     UUID        NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vote_comments_vote_id ON vote_comments(vote_id);

ALTER TABLE vote_comments ENABLE ROW LEVEL SECURITY;

-- 모두 읽기 가능
CREATE POLICY "vote_comments_select" ON vote_comments
  FOR SELECT USING (true);

-- 로그인 사용자는 본인 댓글 작성
CREATE POLICY "vote_comments_insert" ON vote_comments
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1)
  );

-- 본인만 수정
CREATE POLICY "vote_comments_update" ON vote_comments
  FOR UPDATE USING (
    user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1)
  );

-- 본인 또는 임원 삭제
CREATE POLICY "vote_comments_delete" ON vote_comments
  FOR DELETE USING (
    user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid() LIMIT 1)
    OR (SELECT is_executive FROM profiles WHERE auth_id = auth.uid() LIMIT 1) = true
  );
