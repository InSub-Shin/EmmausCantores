-- profiles 정책이 자기 자신(profiles)을 서브쿼리로 참조하면서 RLS 평가가
-- 제대로 되지 않는 문제 해결.
-- SECURITY DEFINER 함수로 임원 여부를 RLS 우회하여 안정적으로 판별한다.

-- 1. 임원 여부 확인 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION public.is_executive_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_id = auth.uid() AND is_executive = true AND is_deleted = false
  );
$$;

-- 2. 기존 UPDATE 정책 정리
DROP POLICY IF EXISTS "profiles_update"           ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_executive" ON public.profiles;

-- 본인 프로필 수정
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- 임원은 모든 단원 프로필 수정 (탈퇴 처리 포함)
CREATE POLICY "profiles_update_executive" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_executive_user())
  WITH CHECK (public.is_executive_user());

-- 3. INSERT 정책도 동일 함수로 통일 (단원 추가)
DROP POLICY IF EXISTS "profiles_insert_executive" ON public.profiles;
CREATE POLICY "profiles_insert_executive" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_executive_user());

-- 4. DELETE 정책도 동일 함수로 통일 (혹시 하드 삭제 시)
DROP POLICY IF EXISTS "profiles_delete_leader"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_executive" ON public.profiles;
CREATE POLICY "profiles_delete_executive" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_executive_user());
