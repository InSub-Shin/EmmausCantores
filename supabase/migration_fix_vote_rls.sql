-- ============================================
-- vote_responses RLS 정책 수정
-- profiles.id가 랜덤 UUID로 바뀐 이후
-- auth.uid() = user_id 비교가 불일치하는 문제 수정
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- INSERT 정책: auth_id를 통해 프로필 소유자 확인
DROP POLICY IF EXISTS "vote_responses_insert" ON public.vote_responses;
CREATE POLICY "vote_responses_insert" ON public.vote_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_id AND auth_id = auth.uid()
    )
  );

-- DELETE 정책: auth_id를 통해 프로필 소유자 확인
DROP POLICY IF EXISTS "vote_responses_delete_own" ON public.vote_responses;
CREATE POLICY "vote_responses_delete_own" ON public.vote_responses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_id AND auth_id = auth.uid()
    )
  );
