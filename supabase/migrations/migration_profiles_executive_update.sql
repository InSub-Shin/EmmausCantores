-- 임원이 모든 단원 프로필을 수정/삭제할 수 있도록 정책 추가
-- (기존 profiles_update_own은 본인만 허용 → 임원 전용 정책 추가)

CREATE POLICY "profiles_update_executive" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );
