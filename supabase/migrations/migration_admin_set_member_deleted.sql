-- is_deleted=true 직접 UPDATE가 RLS WITH CHECK를 통과 못 하는 원인 불명 문제 우회.
-- 임원 여부 확인 후 RLS를 우회(SECURITY DEFINER)하여 탈퇴/복구 처리.
-- 앱은 일반 필드 수정은 기존 UPDATE로, is_deleted는 이 RPC로 처리한다.

CREATE OR REPLACE FUNCTION public.admin_set_member_deleted(p_id uuid, p_deleted boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_executive_user() THEN
    RAISE EXCEPTION '임원만 단원을 탈퇴 처리할 수 있습니다.';
  END IF;
  UPDATE public.profiles SET is_deleted = p_deleted WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_member_deleted(uuid, boolean) TO authenticated;
