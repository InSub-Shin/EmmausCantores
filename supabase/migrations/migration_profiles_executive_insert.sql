-- 임원이 신규 단원 프로필을 생성할 수 있도록 정책 추가
CREATE POLICY "profiles_insert_executive" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );
