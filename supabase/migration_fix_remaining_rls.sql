-- profiles / votes / vote_items / storage RLS 정책 수정
-- profiles.id가 랜덤 UUID로 바뀐 이후
-- auth.uid() = profiles.id 비교 불일치 문제 수정
-- Supabase SQL Editor에서 실행하세요

-- profiles UPDATE (본인만)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id);

-- votes INSERT/DELETE (임원만)
DROP POLICY IF EXISTS "votes_insert_executive" ON public.votes;
CREATE POLICY "votes_insert_executive" ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

DROP POLICY IF EXISTS "votes_delete_executive" ON public.votes;
CREATE POLICY "votes_delete_executive" ON public.votes
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

-- vote_items INSERT (임원만)
DROP POLICY IF EXISTS "vote_items_insert_executive" ON public.vote_items;
CREATE POLICY "vote_items_insert_executive" ON public.vote_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

-- storage: song-files 업로드 (임원만)
DROP POLICY IF EXISTS "song_files_executive_upload" ON storage.objects;
CREATE POLICY "song_files_executive_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'song-files'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );
