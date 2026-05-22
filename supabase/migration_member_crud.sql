-- ============================================
-- 단원 수동 추가/삭제 기능 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. profiles.id 의 auth.users FK 제약 해제 (수동 단원 추가 허용)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. auth_id 컬럼 추가 (카카오 로그인 시 연결용)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE;

-- 기존 프로필의 auth_id를 id로 초기화
UPDATE public.profiles SET auth_id = id WHERE auth_id IS NULL;

-- 3. is_deleted 컬럼 추가 (소프트 삭제)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- 4. 임원이 단원을 추가할 수 있는 RLS 정책 추가
CREATE POLICY "profiles_insert_executive" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
  );

-- 5. 임원이 모든 단원 정보를 수정할 수 있는 정책 추가
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth_id = auth.uid()  -- 본인
    OR EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true) -- 임원
  );

-- 6. 단장만 삭제 가능
CREATE POLICY "profiles_delete_leader" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'leader')
  );

-- 7. 삭제된 단원 제외 select 정책 갱신
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_deleted = false);

-- 8. handle_new_user 트리거 함수 업데이트 (auth_id 사용)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 이미 같은 auth_id가 있으면 업데이트, 없으면 삽입
  INSERT INTO public.profiles (id, auth_id, name)
  VALUES (
    gen_random_uuid(),
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'full_name')
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN new;
END;
$$;
