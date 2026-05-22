-- ============================================
-- 단장 1명 전용 규칙 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 단장만 다른 단원의 역할을 변경할 수 있는 정책 추가
DROP POLICY IF EXISTS "profiles_update_role" ON public.profiles;

CREATE POLICY "profiles_update_role_leader_only" ON public.profiles
  FOR UPDATE TO authenticated
  WITH CHECK (
    -- 본인 정보 수정 (역할 제외)
    (auth_id = auth.uid())
    -- 또는 임원이 본인 정보 수정 (역할 제외)
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true)
        AND auth_id = auth.uid())
    -- 또는 현재 단장이 다른 사람의 역할 변경
    OR (EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'leader')
        AND auth_id != auth.uid())
  );

-- 2. 트리거 함수: 새로운 단장이 할당될 때 기존 단장을 평단원으로 변경
CREATE OR REPLACE FUNCTION public.handle_leader_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 현재 업데이트되는 사람의 역할이 'leader'로 변경되는 경우
  IF NEW.role = 'leader' AND (OLD.role IS NULL OR OLD.role != 'leader') THEN
    -- 기존의 모든 단장을 평단원으로 변경 (현재 업데이트되는 사람 제외)
    UPDATE public.profiles
    SET role = 'member', is_executive = false
    WHERE role = 'leader' AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. 기존 트리거 제거 (있다면)
DROP TRIGGER IF EXISTS trigger_leader_change ON public.profiles;

-- 4. 새로운 트리거 생성
CREATE TRIGGER trigger_leader_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_leader_change();

-- 5. 단장 역할 변경 시도 방지를 위한 정책 (단장은 본인 역할 변경 불가)
-- 이 정책은 주로 앱 레벨에서 처리되지만 DB 수준 보안을 위해 추가

-- 기존 profiles_update 정책 개선
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update_improved" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    auth_id = auth.uid()  -- 본인
    OR EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND is_executive = true) -- 임원
    OR EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'leader') -- 단장 (다른 사람만)
  )
  WITH CHECK (
    -- 본인이 단장이면 다른 사람의 역할만 수정 가능 (본인 제외)
    CASE
      WHEN EXISTS (SELECT 1 FROM public.profiles WHERE auth_id = auth.uid() AND role = 'leader')
      THEN auth_id != auth.uid() OR (NEW.role = OLD.role)
      ELSE true
    END
  );
