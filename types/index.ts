export type Part = 'soprano' | 'alto' | 'tenor' | 'bass';

export type Role =
  | 'member'
  | 'leader'
  | 'vice_leader'
  | 'male_part_leader'
  | 'female_part_leader'
  | 'score_manager'
  | 'treasurer'
  | 'planner'
  | 'pr';

export const PART_LABELS: Record<Part, string> = {
  soprano: '소프라노',
  alto: '알토',
  tenor: '테너',
  bass: '베이스',
};

export const ROLE_LABELS: Record<Role, string> = {
  member: '평단원',
  leader: '단장',
  vice_leader: '부단장',
  male_part_leader: '남자파트장',
  female_part_leader: '여자파트장',
  score_manager: '악보장',
  treasurer: '회계',
  planner: '기획',
  pr: '홍보',
};

export const EXECUTIVE_ROLES: Role[] = [
  'leader',
  'vice_leader',
  'male_part_leader',
  'female_part_leader',
  'score_manager',
  'treasurer',
  'planner',
  'pr',
];

export interface Profile {
  id: string;
  auth_id: string | null;        // auth.users.id (카카오/이메일 로그인 연결)
  name: string | null;
  baptismal_name: string | null;
  phone: string | null;
  birthday: string | null;       // YYYY-MM-DD
  feast_day: string | null;      // MM-DD
  part: Part | null;
  role: Role;
  is_executive: boolean;
  is_deleted: boolean;
  profile_image: string | null;
  push_token: string | null;
  created_at: string;
}

export interface Vote {
  id: string;
  title: string;
  description: string | null;
  is_anonymous: boolean;
  multiple_choice: boolean;
  ends_at: string | null;
  created_by: string;
  created_at: string;
  schedule_id?: string | null;
  creator?: Profile;
  schedule?: { id: string; title: string } | null;
  items?: VoteItem[];
}

export interface VoteItem {
  id: string;
  vote_id: string;
  label: string;
  order_index: number;
  responses?: VoteResponse[];
}

export interface VoteResponse {
  id: string;
  vote_id: string;
  vote_item_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
}

export interface Schedule {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  song_id: string | null;
  song_ids: string[] | null;
  created_by: string;
  created_at: string;
  creator?: Profile;
  song?: Song | null;
  songs?: Song[] | null;
}

export interface Song {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
  youtube_links: string[] | null;
  youtube_titles: string[] | null;
  created_by: string;
  created_at: string;
  creator?: Profile;
  files?: SongFile[];
}

export interface SongFile {
  id: string;
  song_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}
