-- ============================================
-- 엠마우스 깐토레스 샘플 데이터
-- ============================================
-- 실행 순서:
-- 1. schema.sql
-- 2. migration_member_crud.sql
-- 3. migration_songs_youtube.sql
-- 4. migration_schedule_song.sql
-- 5. 이 파일 (seed.sql)
-- ============================================

DO $$
DECLARE
  -- 샘플 단원 UUID
  m1 uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; -- 이지수 (단장, 소프라노)
  m2 uuid := 'aaaaaaaa-0000-0000-0000-000000000002'; -- 박민준 (부단장, 테너)
  m3 uuid := 'aaaaaaaa-0000-0000-0000-000000000003'; -- 김서연 (악보장, 알토)
  m4 uuid := 'aaaaaaaa-0000-0000-0000-000000000004'; -- 최준혁 (회계, 베이스)
  m5 uuid := 'aaaaaaaa-0000-0000-0000-000000000005'; -- 정유진 (평단원, 소프라노)
  m6 uuid := 'aaaaaaaa-0000-0000-0000-000000000006'; -- 한소희 (평단원, 소프라노)
  m7 uuid := 'aaaaaaaa-0000-0000-0000-000000000007'; -- 오동현 (평단원, 테너)
  m8 uuid := 'aaaaaaaa-0000-0000-0000-000000000008'; -- 강민서 (평단원, 알토)
  m9 uuid := 'aaaaaaaa-0000-0000-0000-000000000009'; -- 윤재현 (평단원, 베이스)
  m10 uuid := 'aaaaaaaa-0000-0000-0000-000000000010'; -- 임수아 (평단원, 알토)

  -- 투표 UUID
  v1 uuid;
  v2 uuid;
  v3 uuid;

  -- 투표 항목 UUID
  vi1a uuid; vi1b uuid;
  vi2a uuid; vi2b uuid; vi2c uuid;
  vi3a uuid; vi3b uuid; vi3c uuid;


BEGIN

  -- ============================================
  -- 단원 프로필 삽입
  -- ============================================
  INSERT INTO public.profiles (id, auth_id, name, baptismal_name, phone, birthday, feast_day, part, role, is_executive, is_deleted)
  VALUES
    (m1,  NULL, '이지수', '데레사',   '010-1111-2222', '1985-10-15', '10-15', 'soprano', 'leader',          true,  false),
    (m2,  NULL, '박민준', '요셉',     '010-2222-3333', '1988-03-19', '03-19', 'tenor',   'vice_leader',      true,  false),
    (m3,  NULL, '김서연', '루치아',   '010-3333-4444', '1990-12-13', '12-13', 'alto',    'score_manager',    true,  false),
    (m4,  NULL, '최준혁', '미카엘',   '010-4444-5555', '1987-09-29', '09-29', 'bass',    'treasurer',        true,  false),
    (m5,  NULL, '정유진', '아녜스',   '010-5555-6666', '1993-01-21', '01-21', 'soprano', 'member',           false, false),
    (m6,  NULL, '한소희', '안나',     '010-6666-7777', '1995-07-26', '07-26', 'soprano', 'member',           false, false),
    (m7,  NULL, '오동현', '안드레아', '010-7777-8888', '1991-11-30', '11-30', 'tenor',   'member',           false, false),
    (m8,  NULL, '강민서', '막달레나', '010-8888-9999', '1994-07-22', '07-22', 'alto',    'member',           false, false),
    (m9,  NULL, '윤재현', '베드로',   '010-9999-0000', '1989-06-29', '06-29', 'bass',    'member',           false, false),
    (m10, NULL, '임수아', '세실리아', '010-1010-2020', '1996-11-22', '11-22', 'alto',    'member',           false, false)
  ON CONFLICT (id) DO NOTHING;


  -- ============================================
  -- 투표 1: 친교 참석 여부 (진행 중)
  -- ============================================
  INSERT INTO public.votes (id, title, description, multiple_choice, ends_at, created_by)
  VALUES (
    gen_random_uuid(),
    '이번 주 주일미사 후 친교 참석 여부',
    '미사 후 본당 1층에서 친교 모임이 있습니다. 참석 여부를 알려주세요.',
    false,
    now() + interval '3 days',
    m1
  ) RETURNING id INTO v1;

  INSERT INTO public.vote_items (id, vote_id, label, order_index)
  VALUES
    (gen_random_uuid(), v1, '참석', 0),
    (gen_random_uuid(), v1, '불참', 1);

  SELECT id INTO vi1a FROM public.vote_items WHERE vote_id = v1 AND label = '참석';
  SELECT id INTO vi1b FROM public.vote_items WHERE vote_id = v1 AND label = '불참';

  INSERT INTO public.vote_responses (vote_id, vote_item_id, user_id)
  VALUES
    (v1, vi1a, m1),
    (v1, vi1a, m2),
    (v1, vi1a, m5),
    (v1, vi1a, m6),
    (v1, vi1b, m3),
    (v1, vi1b, m7)
  ON CONFLICT DO NOTHING;


  -- ============================================
  -- 투표 2: 특송 선곡 (복수선택, 진행 중)
  -- ============================================
  INSERT INTO public.votes (id, title, description, multiple_choice, ends_at, created_by)
  VALUES (
    gen_random_uuid(),
    '다음 달 정기 연주회 특송 선곡',
    '아래 후보 곡 중 원하는 곡을 모두 선택해주세요. (복수 선택 가능)',
    true,
    now() + interval '5 days',
    m1
  ) RETURNING id INTO v2;

  INSERT INTO public.vote_items (id, vote_id, label, order_index) VALUES
    (gen_random_uuid(), v2, '아베 마리아 (슈베르트)', 0),
    (gen_random_uuid(), v2, '할렐루야 (헨델)', 1),
    (gen_random_uuid(), v2, '주님의 기도 (말로트)', 2);

  SELECT id INTO vi2a FROM public.vote_items WHERE vote_id = v2 AND order_index = 0;
  SELECT id INTO vi2b FROM public.vote_items WHERE vote_id = v2 AND order_index = 1;
  SELECT id INTO vi2c FROM public.vote_items WHERE vote_id = v2 AND order_index = 2;

  INSERT INTO public.vote_responses (vote_id, vote_item_id, user_id) VALUES
    (v2, vi2a, m1), (v2, vi2b, m1),
    (v2, vi2b, m2), (v2, vi2c, m2),
    (v2, vi2a, m5),
    (v2, vi2b, m6), (v2, vi2c, m6),
    (v2, vi2c, m8)
  ON CONFLICT DO NOTHING;


  -- ============================================
  -- 투표 3: 연습 시간 변경 (종료됨)
  -- ============================================
  INSERT INTO public.votes (id, title, description, multiple_choice, ends_at, created_by)
  VALUES (
    gen_random_uuid(),
    '정기 연습 시간 변경 제안',
    '현재 토요일 14시에서 변경 여부를 결정합니다.',
    false,
    now() - interval '2 days',
    m2
  ) RETURNING id INTO v3;

  INSERT INTO public.vote_items (id, vote_id, label, order_index) VALUES
    (gen_random_uuid(), v3, '현행 유지 (토요일 14시)', 0),
    (gen_random_uuid(), v3, '토요일 10시로 변경', 1),
    (gen_random_uuid(), v3, '일요일 13시로 변경', 2);

  SELECT id INTO vi3a FROM public.vote_items WHERE vote_id = v3 AND order_index = 0;
  SELECT id INTO vi3b FROM public.vote_items WHERE vote_id = v3 AND order_index = 1;
  SELECT id INTO vi3c FROM public.vote_items WHERE vote_id = v3 AND order_index = 2;

  INSERT INTO public.vote_responses (vote_id, vote_item_id, user_id) VALUES
    (v3, vi3a, m1), (v3, vi3a, m2), (v3, vi3a, m5), (v3, vi3a, m7),
    (v3, vi3b, m3), (v3, vi3b, m8), (v3, vi3b, m10),
    (v3, vi3c, m4), (v3, vi3c, m9)
  ON CONFLICT DO NOTHING;


  -- ============================================
  -- 일정
  -- ============================================
  INSERT INTO public.schedules (title, description, start_at, end_at, location, created_by) VALUES

    -- 이번 주 주일미사 (하루종일)
    (
      '주일미사 특송',
      '성가대 10분 전 집결',
      date_trunc('week', now()) + interval '6 days' + interval '0 hours',
      NULL,
      '본당 성전',
      m1
    ),

    -- 정기 연습 (시간 있음)
    (
      '월례 정기 연습',
      '악보 지참 필수. 새 곡 연습 예정.',
      date_trunc('week', now()) + interval '5 days' + interval '14 hours',
      date_trunc('week', now()) + interval '5 days' + interval '17 hours',
      '본당 소강당',
      m1
    ),

    -- 성탄 준비 연습 (이틀짜리 하루종일)
    (
      '성탄 특송 준비 연습',
      '집중 연습 기간. 전원 참석 바랍니다.',
      date_trunc('year', now() + interval '1 year') - interval '12 days',
      date_trunc('year', now() + interval '1 year') - interval '10 days',
      '본당 소강당',
      m2
    ),

    -- 성탄 미사 (하루종일)
    (
      '성탄 미사 특송',
      NULL,
      date_trunc('year', now() + interval '1 year') - interval '7 days',
      NULL,
      '본당 성전',
      m1
    ),

    -- 신년 음악회
    (
      '신년 음악회',
      '지역 성가대 연합 신년 음악회. 정장 착용.',
      date_trunc('year', now() + interval '1 year') + interval '14 days' + interval '15 hours',
      date_trunc('year', now() + interval '1 year') + interval '14 days' + interval '17 hours',
      '시민문화회관 대강당',
      m1
    );


  -- ============================================
  -- 특송 정보
  -- ============================================
  INSERT INTO public.songs (id, title, description, youtube_url, youtube_links, created_by)
  VALUES
    (
      gen_random_uuid(),
      '아베 마리아 (슈베르트)',
      '슈베르트 작곡. 소프라노·알토 2부 합창.',
      'https://www.youtube.com/watch?v=aVjDPJAHKhQ',
      ARRAY['https://www.youtube.com/watch?v=aVjDPJAHKhQ'],
      m1
    ),
    (
      gen_random_uuid(),
      '할렐루야 (헨델 메시아)',
      '헨델 메시아 중 합창. 성가대 전체 합창 버전.',
      'https://www.youtube.com/watch?v=IFTPnLkO5Kg',
      ARRAY['https://www.youtube.com/watch?v=IFTPnLkO5Kg', 'https://www.youtube.com/watch?v=bbf9KNhOMFg'],
      m2
    ),
    (
      gen_random_uuid(),
      '주님의 기도 (말로트)',
      '알베르 말로트 편곡. 독창 후 합창 버전.',
      'https://www.youtube.com/watch?v=i8FiJQnfSTY',
      ARRAY['https://www.youtube.com/watch?v=i8FiJQnfSTY'],
      m1
    );

END;
$$;


-- ============================================
-- [필수] 테스트 계정을 단장으로 설정
-- 아래 이메일 주소를 본인 테스트 계정 이메일로 바꿔서 실행하세요
-- ============================================
UPDATE public.profiles
SET role = 'leader', is_executive = true
WHERE auth_id = (
  SELECT id FROM auth.users WHERE email = 'your-test-email@example.com'
);
