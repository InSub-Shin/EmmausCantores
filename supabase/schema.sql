-- ============================================
-- 엠마우스 깐토레스 Supabase Schema
-- ============================================

-- profiles (auth.users 확장)
create table public.profiles (
  id          uuid references auth.users primary key,
  name        text,
  baptismal_name text,
  phone       text,
  birthday    date,           -- 년월일 전체
  feast_day   text,           -- MM-DD 형식
  part        text check (part in ('soprano', 'alto', 'tenor', 'bass')),
  role        text not null default 'member'
              check (role in ('member','leader','vice_leader','male_part_leader','female_part_leader','score_manager','treasurer','planner','pr')),
  is_executive boolean not null default false,
  profile_image text,
  push_token  text,
  created_at  timestamptz default now()
);

-- 신규 사용자 가입 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- votes
create table public.votes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  is_anonymous    boolean not null default false,
  multiple_choice boolean not null default false,
  ends_at         timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now()
);

-- vote_items
create table public.vote_items (
  id          uuid primary key default gen_random_uuid(),
  vote_id     uuid references public.votes(id) on delete cascade,
  label       text not null,
  order_index int not null default 0
);

-- vote_responses
create table public.vote_responses (
  id           uuid primary key default gen_random_uuid(),
  vote_id      uuid references public.votes(id) on delete cascade,
  vote_item_id uuid references public.vote_items(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (vote_item_id, user_id)
);

-- schedules
create table public.schedules (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  start_at    timestamptz not null,
  end_at      timestamptz,
  location    text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- songs (특송 정보)
create table public.songs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  youtube_url text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- song_files
create table public.song_files (
  id        uuid primary key default gen_random_uuid(),
  song_id   uuid references public.songs(id) on delete cascade,
  file_name text not null,
  file_url  text not null,
  file_type text,
  created_at timestamptz default now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.profiles      enable row level security;
alter table public.votes         enable row level security;
alter table public.vote_items    enable row level security;
alter table public.vote_responses enable row level security;
alter table public.schedules     enable row level security;
alter table public.songs         enable row level security;
alter table public.song_files    enable row level security;

-- profiles: 모든 로그인 사용자가 조회 가능 / 본인 또는 임원만 수정
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

-- votes: 모든 로그인 사용자가 조회 가능 / 임원만 생성
create policy "votes_select" on public.votes for select to authenticated using (true);
create policy "votes_insert_executive" on public.votes for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_executive = true));
create policy "votes_delete_executive" on public.votes for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_executive = true));

-- vote_items
create policy "vote_items_select" on public.vote_items for select to authenticated using (true);
create policy "vote_items_insert_executive" on public.vote_items for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_executive = true));

-- vote_responses: 본인 투표 관리
create policy "vote_responses_select" on public.vote_responses for select to authenticated using (true);
create policy "vote_responses_insert" on public.vote_responses for insert to authenticated
  with check (auth.uid() = user_id);
create policy "vote_responses_delete_own" on public.vote_responses for delete to authenticated
  using (auth.uid() = user_id);

-- schedules: 모든 로그인 사용자 조회 / 임원만 생성·삭제
create policy "schedules_select" on public.schedules for select to authenticated using (true);
create policy "schedules_insert_executive" on public.schedules for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_executive = true));
create policy "schedules_delete_executive" on public.schedules for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_executive = true));

-- songs / song_files
create policy "songs_select" on public.songs for select to authenticated using (true);
create policy "songs_insert_executive" on public.songs for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_executive = true));
create policy "song_files_select" on public.song_files for select to authenticated using (true);
create policy "song_files_insert_executive" on public.song_files for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_executive = true));

-- ============================================
-- Storage Buckets
-- ============================================

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('song-files', 'song-files', true);

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "song_files_public_read" on storage.objects for select using (bucket_id = 'song-files');
create policy "song_files_executive_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'song-files' and exists (select 1 from public.profiles where id = auth.uid() and is_executive = true));
