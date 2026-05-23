-- schedules / songs / votes / vote_items UPDATE RLS 정책 추가
-- 원본 schema.sql에 UPDATE 정책이 없어서 수정이 전부 차단됨
-- Supabase SQL Editor에서 실행하세요

-- schedules UPDATE (임원만)
CREATE POLICY "schedules_update_executive" ON public.schedules
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

-- songs UPDATE (임원만)
CREATE POLICY "songs_update_executive" ON public.songs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

-- votes UPDATE (임원만)
CREATE POLICY "votes_update_executive" ON public.votes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

-- vote_items UPDATE (임원만)
CREATE POLICY "vote_items_update_executive" ON public.vote_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );
