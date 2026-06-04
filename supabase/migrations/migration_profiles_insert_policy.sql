-- 회원가입 시 본인 프로필 생성 허용
-- auth.uid() = auth_id 인 경우에만 INSERT 가능
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth_id = auth.uid());
