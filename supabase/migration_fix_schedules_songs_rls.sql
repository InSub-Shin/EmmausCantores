-- schedules / songs / song_files RLS 정책 수정
-- profiles.id가 랜덤 UUID로 바뀐 이후
-- auth.uid() = profiles.id 비교 불일치 문제 수정
-- Supabase SQL Editor에서 실행하세요

-- schedules INSERT/DELETE
DROP POLICY IF EXISTS "schedules_insert_executive" ON public.schedules;
CREATE POLICY "schedules_insert_executive" ON public.schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

DROP POLICY IF EXISTS "schedules_delete_executive" ON public.schedules;
CREATE POLICY "schedules_delete_executive" ON public.schedules
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

-- songs INSERT
DROP POLICY IF EXISTS "songs_insert_executive" ON public.songs;
CREATE POLICY "songs_insert_executive" ON public.songs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

-- song_files INSERT
DROP POLICY IF EXISTS "song_files_insert_executive" ON public.song_files;
CREATE POLICY "song_files_insert_executive" ON public.song_files
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );
