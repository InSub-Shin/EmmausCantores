import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useHomeNavigationStore } from '@/store/home-navigation';
import { Post, PostComment, Vote, Song } from '@/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';

function fmt(iso: string) {
  return format(new Date(iso), 'M월 d일 HH:mm', { locale: ko });
}

// ── types ─────────────────────────────────────────────────────────────────────

type SelectedSong = { id: string; title: string };

type FormState = {
  title: string;
  content: string;
  is_notice: boolean;
  vote_id: string | null;
  vote_title: string | null;
  selected_songs: SelectedSong[];
};

const emptyForm: FormState = {
  title: '',
  content: '',
  is_notice: false,
  vote_id: null,
  vote_title: null,
  selected_songs: [],
};

type VoteForm = {
  title: string;
  description: string;
  is_anonymous: boolean;
  multiple_choice: boolean;
  ends_at: string;
  items: string[];
};

const emptyVoteForm: VoteForm = {
  title: '',
  description: '',
  is_anonymous: false,
  multiple_choice: false,
  ends_at: '',
  items: ['', ''],
};

// ── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-white rounded-xl p-4 mb-2 border ${post.is_notice ? 'border-indigo-300' : 'border-gray-100'}`}
    >
      <View className="flex-row items-center gap-2 mb-1">
        {post.is_notice && (
          <View className="bg-indigo-500 rounded px-1.5 py-0.5">
            <Text className="text-white text-xs font-bold">공지</Text>
          </View>
        )}
        {!post.is_read && <View className="w-2 h-2 bg-red-500 rounded-full" />}
        <Text className="text-gray-900 font-semibold text-sm flex-1" numberOfLines={1}>
          {post.title}
        </Text>
      </View>
      <Text className="text-gray-500 text-xs mb-2" numberOfLines={2}>{post.content}</Text>
      <View className="flex-row gap-2 flex-wrap">
        {post.vote_id && (
          <View className="flex-row items-center bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 gap-1">
            <Text className="text-xs">🗳️</Text>
            <Text className="text-orange-700 text-xs" numberOfLines={1}>{post.vote?.title ?? '투표'}</Text>
          </View>
        )}
        {(post.songs ?? []).map((s) => (
          <View key={s.id} className="flex-row items-center bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 gap-1">
            <Text className="text-xs">🎵</Text>
            <Text className="text-blue-700 text-xs" numberOfLines={1}>{s.title}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-gray-400 text-xs">{post.creator?.name ?? '알 수 없음'}</Text>
        <Text className="text-gray-400 text-xs">{fmt(post.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── SongMultiPicker ───────────────────────────────────────────────────────────

function SongMultiPicker({
  visible,
  songs,
  selected,
  onDone,
  onClose,
}: {
  visible: boolean;
  songs: Song[];
  selected: SelectedSong[];
  onDone: (songs: SelectedSong[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<SelectedSong[]>([]);

  useEffect(() => {
    if (visible) setLocal(selected);
  }, [visible]);

  const toggle = (song: Song) => {
    setLocal((prev) =>
      prev.some((s) => s.id === song.id)
        ? prev.filter((s) => s.id !== song.id)
        : [...prev, { id: song.id, title: song.title }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '75%' }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-500 text-base">취소</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold text-gray-900">특송 선택</Text>
            <TouchableOpacity onPress={() => { onDone(local); onClose(); }}>
              <Text className="text-indigo-600 text-base font-semibold">완료</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={songs}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const checked = local.some((s) => s.id === item.id);
              return (
                <TouchableOpacity
                  onPress={() => toggle(item)}
                  className={`flex-row items-center px-4 py-3 rounded-xl mb-2 border ${checked ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-100'}`}
                >
                  <View className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                    {checked && <Text className="text-white text-xs font-bold">✓</Text>}
                  </View>
                  <Text className={`text-sm flex-1 ${checked ? 'text-blue-700 font-semibold' : 'text-gray-800'}`} numberOfLines={1}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── VotePicker ────────────────────────────────────────────────────────────────

function VotePicker({
  visible,
  votes,
  selectedId,
  onSelect,
  onClear,
  onCreateNew,
  onClose,
}: {
  visible: boolean;
  votes: Vote[];
  selectedId: string | null;
  onSelect: (v: Vote) => void;
  onClear: () => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: '75%' }}>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-500 text-base">취소</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold text-gray-900">투표 선택</Text>
            <TouchableOpacity onPress={() => { onClear(); onClose(); }}>
              <Text className="text-red-400 text-sm">연결 해제</Text>
            </TouchableOpacity>
          </View>

          {/* 새 투표 만들기 버튼 */}
          <TouchableOpacity
            onPress={() => { onClose(); onCreateNew(); }}
            className="mx-4 mt-3 mb-1 flex-row items-center justify-center bg-indigo-500 rounded-xl py-3 gap-2"
          >
            <Text className="text-white text-sm font-semibold">+ 새 투표 만들기</Text>
          </TouchableOpacity>

          <FlatList
            data={votes}
            keyExtractor={(v) => v.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onSelect(item); onClose(); }}
                className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-2 border ${selectedId === item.id ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-100'}`}
              >
                <View className="flex-1">
                  <Text className={`text-sm ${selectedId === item.id ? 'text-indigo-700 font-semibold' : 'text-gray-800'}`} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.ends_at && (
                    <Text className="text-xs text-gray-400 mt-0.5">
                      종료: {format(new Date(item.ends_at), 'M월 d일', { locale: ko })}
                    </Text>
                  )}
                </View>
                {selectedId === item.id && <Text className="text-indigo-500 ml-2">✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── VoteCreateModal ───────────────────────────────────────────────────────────

function VoteCreateModal({
  visible,
  profile,
  onCreated,
  onClose,
}: {
  visible: boolean;
  profile: any;
  onCreated: (vote: Vote) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<VoteForm>(emptyVoteForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setForm(emptyVoteForm);
  }, [visible]);

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, ''] }));
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const setItem = (i: number, val: string) =>
    setForm((f) => ({ ...f, items: f.items.map((v, idx) => (idx === i ? val : v)) }));

  const handleSave = async () => {
    const validItems = form.items.map((s) => s.trim()).filter(Boolean);
    if (!form.title.trim()) return Alert.alert('제목을 입력해주세요.');
    if (validItems.length < 2) return Alert.alert('항목을 2개 이상 입력해주세요.');
    setSaving(true);
    try {
      const { data: vote, error } = await supabase
        .from('votes')
        .insert({
          title: form.title.trim(),
          description: form.description.trim() || null,
          is_anonymous: form.is_anonymous,
          multiple_choice: form.multiple_choice,
          ends_at: form.ends_at || null,
          created_by: profile.id,
        })
        .select()
        .single();
      if (error) throw error;

      const itemRows = validItems.map((label, idx) => ({
        vote_id: vote.id,
        label,
        order_index: idx,
      }));
      const { error: itemsError } = await supabase.from('vote_items').insert(itemRows);
      if (itemsError) throw itemsError;

      onCreated(vote as Vote);
      onClose();
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '투표 생성에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-500 text-base">취소</Text>
            </TouchableOpacity>
            <Text className="text-base font-bold text-gray-900">투표 만들기</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text className="text-indigo-600 text-base font-semibold">생성</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            <Text className="text-sm font-medium text-gray-700 mb-1">제목</Text>
            <TextInput
              value={form.title}
              onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
              placeholder="투표 제목"
              placeholderTextColor="#9ca3af"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base mb-4"
              style={{ color: '#111827' }}
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">설명 (선택)</Text>
            <TextInput
              value={form.description}
              onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
              placeholder="투표 설명"
              placeholderTextColor="#9ca3af"
              multiline
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base mb-4"
              style={{ color: '#111827', minHeight: 72 }}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">투표 항목</Text>
            {form.items.map((item, i) => (
              <View key={i} className="flex-row items-center mb-2 gap-2">
                <TextInput
                  value={item}
                  onChangeText={(t) => setItem(i, t)}
                  placeholder={`항목 ${i + 1}`}
                  placeholderTextColor="#9ca3af"
                  className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base"
                  style={{ color: '#111827' }}
                />
                {form.items.length > 2 && (
                  <TouchableOpacity onPress={() => removeItem(i)} className="p-2">
                    <Text className="text-red-400 text-base">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={addItem}
              className="border border-dashed border-gray-300 rounded-xl py-3 items-center mb-4"
            >
              <Text className="text-gray-400 text-sm">+ 항목 추가</Text>
            </TouchableOpacity>

            <DateTimePickerField
              label="종료 시간 (선택)"
              value={form.ends_at}
              onChange={(v) => setForm((f) => ({ ...f, ends_at: v }))}
              placeholder="종료 시간 없음"
            />

            <View className="gap-2 mt-1">
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, is_anonymous: !f.is_anonymous }))}
                className="flex-row items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
              >
                <View className={`w-5 h-5 rounded border-2 items-center justify-center ${form.is_anonymous ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                  {form.is_anonymous && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-gray-800 text-sm font-medium">익명 투표</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, multiple_choice: !f.multiple_choice }))}
                className="flex-row items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
              >
                <View className={`w-5 h-5 rounded border-2 items-center justify-center ${form.multiple_choice ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                  {form.multiple_choice && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-gray-800 text-sm font-medium">복수 선택 허용</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── PostFormFields ────────────────────────────────────────────────────────────

function PostFormFields({
  form,
  onChange,
  votes,
  songs,
  onCreateVote,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  votes: Vote[];
  songs: Song[];
  onCreateVote: () => void;
}) {
  const [showVotePicker, setShowVotePicker] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);

  return (
    <>
      <Text className="text-sm font-medium text-gray-700 mb-1">제목</Text>
      <TextInput
        value={form.title}
        onChangeText={(t) => onChange({ ...form, title: t })}
        placeholder="제목을 입력하세요"
        placeholderTextColor="#9ca3af"
        className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base mb-4"
        style={{ color: '#111827' }}
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">내용</Text>
      <TextInput
        value={form.content}
        onChangeText={(t) => onChange({ ...form, content: t })}
        placeholder="내용을 입력하세요"
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={8}
        textAlignVertical="top"
        className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base mb-4"
        style={{ color: '#111827', minHeight: 160 }}
      />

      {/* 투표 연결 */}
      <Text className="text-sm font-medium text-gray-700 mb-1">투표 연결</Text>
      <TouchableOpacity
        onPress={() => setShowVotePicker(true)}
        className={`flex-row items-center justify-between border rounded-xl px-4 py-3 mb-4 ${form.vote_id ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-300'}`}
      >
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-base">🗳️</Text>
          <Text className={`text-sm flex-1 ${form.vote_id ? 'text-orange-700 font-medium' : 'text-gray-400'}`} numberOfLines={1}>
            {form.vote_title ?? '투표 선택 또는 생성'}
          </Text>
        </View>
        {form.vote_id ? (
          <TouchableOpacity
            onPress={() => onChange({ ...form, vote_id: null, vote_title: null })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-gray-400 text-base">✕</Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-gray-400 text-sm">선택</Text>
        )}
      </TouchableOpacity>

      {/* 특송 연결 (다중) */}
      <Text className="text-sm font-medium text-gray-700 mb-1">특송 연결</Text>
      {form.selected_songs.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-2">
          {form.selected_songs.map((s) => (
            <View key={s.id} className="flex-row items-center bg-blue-50 border border-blue-300 rounded-full px-3 py-1 gap-1">
              <Text className="text-blue-700 text-xs font-medium" numberOfLines={1}>{s.title}</Text>
              <TouchableOpacity
                onPress={() => onChange({ ...form, selected_songs: form.selected_songs.filter((x) => x.id !== s.id) })}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text className="text-blue-400 text-xs ml-1">✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        onPress={() => setShowSongPicker(true)}
        className="border border-dashed border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row items-center gap-2"
      >
        <Text className="text-base">🎵</Text>
        <Text className="text-gray-400 text-sm">
          {form.selected_songs.length > 0 ? '특송 추가/변경' : '특송 선택 (선택 사항)'}
        </Text>
      </TouchableOpacity>

      {/* 공지 */}
      <TouchableOpacity
        onPress={() => onChange({ ...form, is_notice: !form.is_notice })}
        className="flex-row items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
      >
        <View className={`w-5 h-5 rounded border-2 items-center justify-center ${form.is_notice ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
          {form.is_notice && <Text className="text-white text-xs font-bold">✓</Text>}
        </View>
        <Text className="text-gray-800 text-sm font-medium">공지사항으로 설정</Text>
      </TouchableOpacity>

      <VotePicker
        visible={showVotePicker}
        votes={votes}
        selectedId={form.vote_id}
        onSelect={(v) => onChange({ ...form, vote_id: v.id, vote_title: v.title })}
        onClear={() => onChange({ ...form, vote_id: null, vote_title: null })}
        onCreateNew={() => { setShowVotePicker(false); onCreateVote(); }}
        onClose={() => setShowVotePicker(false)}
      />
      <SongMultiPicker
        visible={showSongPicker}
        songs={songs}
        selected={form.selected_songs}
        onDone={(songs) => onChange({ ...form, selected_songs: songs })}
        onClose={() => setShowSongPicker(false)}
      />
    </>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function PostsScreen() {
  const { profile } = useAuthStore();
  const { selectedPost, setSelectedPost, setSelectedVote, setSelectedSong } = useHomeNavigationStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<PostComment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVoteCreate, setShowVoteCreate] = useState(false);
  const [pendingVoteTarget, setPendingVoteTarget] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Post | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const commentInputRef = useRef<TextInput>(null);

  const isExecutive = profile?.is_executive ?? false;

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [{ data: postsData }, { data: readsData }] = await Promise.all([
        supabase
          .from('posts')
          .select('*, creator:profiles!created_by(id, name), vote:votes(id, title)')
          .order('created_at', { ascending: false }),
        supabase.from('post_reads').select('post_id').eq('user_id', profile.id),
      ]);

      if (postsData) {
        const readIds = new Set((readsData ?? []).map((r: any) => r.post_id));
        const allSongIds = [...new Set((postsData as any[]).flatMap((p) => p.song_ids ?? []))];

        let songMap: Record<string, { id: string; title: string }> = {};
        if (allSongIds.length > 0) {
          const { data: songsData } = await supabase
            .from('songs')
            .select('id, title')
            .in('id', allSongIds);
          for (const s of songsData ?? []) songMap[s.id] = s;
        }

        const merged = (postsData as any[]).map((p) => ({
          ...p,
          is_read: readIds.has(p.id),
          songs: (p.song_ids ?? []).map((id: string) => songMap[id]).filter(Boolean),
        }));
        const notice = merged.filter((p) => p.is_notice);
        const rest = merged.filter((p) => !p.is_notice);
        setPosts([...notice, ...rest]);
      }
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const fetchVotesSongs = useCallback(async () => {
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase.from('votes').select('id, title, ends_at').order('created_at', { ascending: false }),
      supabase.from('songs').select('id, title').order('created_at', { ascending: false }),
    ]);
    setVotes((v as Vote[]) ?? []);
    setSongs((s as Song[]) ?? []);
  }, []);

  const fetchComments = useCallback(async (postId: string) => {
    const { data } = await supabase
      .from('post_comments')
      .select('*, author:profiles!user_id(id, name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments((data as any[]) ?? []);
  }, []);

  useFocusEffect(useCallback(() => { fetchPosts(); }, [fetchPosts]));

  useEffect(() => {
    if (selectedPost) { openDetail(selectedPost); setSelectedPost(null); }
  }, [selectedPost]);

  // ── detail ─────────────────────────────────────────────────────────────────

  const openDetail = async (post: Post) => {
    setDetailPost(post);
    setCommentText('');
    setEditingComment(null);
    await fetchComments(post.id);

    if (!post.is_read && profile) {
      await supabase
        .from('post_reads')
        .upsert({ post_id: post.id, user_id: profile.id }, { onConflict: 'post_id,user_id' });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_read: true } : p)));
    }
  };

  const closeDetail = () => {
    setDetailPost(null);
    setComments([]);
    setCommentText('');
    setEditingComment(null);
  };

  // ── comments ───────────────────────────────────────────────────────────────

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !profile || !detailPost) return;
    setSubmitting(true);
    try {
      if (editingComment) {
        const { error } = await supabase
          .from('post_comments')
          .update({ content: commentText.trim(), updated_at: new Date().toISOString() })
          .eq('id', editingComment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_comments').insert({
          post_id: detailPost.id,
          user_id: profile.id,
          content: commentText.trim(),
        });
        if (error) throw error;
      }
      setCommentText('');
      setEditingComment(null);
      await fetchComments(detailPost.id);
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '댓글 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (comment: PostComment) => {
    Alert.alert('댓글 삭제', '삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await supabase.from('post_comments').delete().eq('id', comment.id);
        if (detailPost) await fetchComments(detailPost.id);
      }},
    ]);
  };

  const startEditComment = (comment: PostComment) => {
    setEditingComment(comment);
    setCommentText(comment.content);
    commentInputRef.current?.focus();
  };

  // ── post CRUD ──────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setForm(emptyForm);
    fetchVotesSongs();
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim() || !profile) return;
    setSubmitting(true);
    try {
      if (form.is_notice) {
        await supabase.from('posts').update({ is_notice: false }).eq('is_notice', true);
      }
      const { error } = await supabase.from('posts').insert({
        title: form.title.trim(),
        content: form.content.trim(),
        is_notice: form.is_notice,
        vote_id: form.vote_id,
        song_ids: form.selected_songs.map((s) => s.id),
        created_by: profile.id,
      });
      if (error) throw error;
      setShowCreateModal(false);
      await fetchPosts();
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '게시글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (post: Post) => {
    setEditTarget(post);
    setForm({
      title: post.title,
      content: post.content,
      is_notice: post.is_notice,
      vote_id: post.vote_id,
      vote_title: post.vote?.title ?? null,
      selected_songs: post.songs ?? [],
    });
    fetchVotesSongs();
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!form.title.trim() || !form.content.trim() || !editTarget) return;
    setSubmitting(true);
    try {
      if (form.is_notice && !editTarget.is_notice) {
        await supabase.from('posts').update({ is_notice: false }).eq('is_notice', true);
      }
      const { error } = await supabase
        .from('posts')
        .update({
          title: form.title.trim(),
          content: form.content.trim(),
          is_notice: form.is_notice,
          vote_id: form.vote_id,
          song_ids: form.selected_songs.map((s) => s.id),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editTarget.id);
      if (error) throw error;
      setShowEditModal(false);
      setDetailPost(null);
      await fetchPosts();
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '게시글 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = (post: Post) => {
    Alert.alert('게시글 삭제', `"${post.title}"을(를) 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await supabase.from('posts').delete().eq('id', post.id);
        closeDetail();
        await fetchPosts();
      }},
    ]);
  };

  // vote created from within post form → auto-link and refresh votes list
  const handleVoteCreated = async (vote: Vote) => {
    await fetchVotesSongs();
    setForm((f) => ({ ...f, vote_id: vote.id, vote_title: vote.title }));
    if (pendingVoteTarget === 'create') setShowCreateModal(true);
    else if (pendingVoteTarget === 'edit') setShowEditModal(true);
    setPendingVoteTarget(null);
  };

  const openVoteCreate = (target: 'create' | 'edit') => {
    setPendingVoteTarget(target);
    setShowVoteCreate(true);
  };

  // ── render ─────────────────────────────────────────────────────────────────

  const unreadCount = posts.filter((p) => !p.is_read).length;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      {/* header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-bold text-gray-900">게시판</Text>
          {unreadCount > 0 && (
            <View className="bg-red-500 rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-bold">{unreadCount}</Text>
            </View>
          )}
        </View>
        {isExecutive && (
          <TouchableOpacity onPress={openCreateModal} className="bg-indigo-500 rounded-xl px-4 py-2">
            <Text className="text-white text-sm font-semibold">+ 작성</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 text-base">게시글이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <PostCard post={item} onPress={() => openDetail(item)} />}
        />
      )}

      {/* ── detail modal ── */}
      <Modal visible={!!detailPost} animationType="slide" onRequestClose={closeDetail}>
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
              <TouchableOpacity onPress={closeDetail} className="py-1 pr-3">
                <Text className="text-indigo-600 text-base">← 목록</Text>
              </TouchableOpacity>
              {isExecutive && detailPost && (
                <View className="flex-row gap-3">
                  <TouchableOpacity onPress={() => openEditModal(detailPost)}>
                    <Text className="text-indigo-600 text-sm font-medium">수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePost(detailPost)}>
                    <Text className="text-red-500 text-sm font-medium">삭제</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
              {detailPost && (
                <>
                  <View className="flex-row items-center gap-2 mb-2">
                    {detailPost.is_notice && (
                      <View className="bg-indigo-500 rounded px-2 py-0.5">
                        <Text className="text-white text-xs font-bold">공지</Text>
                      </View>
                    )}
                    <Text className="text-gray-900 text-xl font-bold flex-1">{detailPost.title}</Text>
                  </View>
                  <View className="flex-row justify-between mb-4">
                    <Text className="text-gray-500 text-xs">{detailPost.creator?.name ?? '알 수 없음'}</Text>
                    <Text className="text-gray-400 text-xs">{fmt(detailPost.created_at)}</Text>
                  </View>

                  <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                    <Text className="text-gray-800 text-base leading-6">{detailPost.content}</Text>
                  </View>

                  {/* 연결된 투표 */}
                  {detailPost.vote_id && detailPost.vote && (
                    <TouchableOpacity
                      onPress={() => {
                        closeDetail();
                        setSelectedVote(detailPost.vote as any);
                        router.push('/(main)/votes');
                      }}
                      className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-3 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <Text className="text-2xl">🗳️</Text>
                        <View className="flex-1">
                          <Text className="text-xs text-orange-500 font-medium mb-0.5">연결된 투표</Text>
                          <Text className="text-orange-800 font-semibold text-sm" numberOfLines={1}>{detailPost.vote.title}</Text>
                        </View>
                      </View>
                      <Text className="text-orange-400 text-base">→</Text>
                    </TouchableOpacity>
                  )}

                  {/* 연결된 특송들 */}
                  {(detailPost.songs ?? []).length > 0 && (
                    <View className="mb-4">
                      {(detailPost.songs ?? []).map((song) => (
                        <TouchableOpacity
                          key={song.id}
                          onPress={() => {
                            closeDetail();
                            setSelectedSong(song as any);
                            router.push('/(main)/songs/index' as any);
                          }}
                          className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2 flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center gap-3 flex-1">
                            <Text className="text-2xl">🎵</Text>
                            <View className="flex-1">
                              <Text className="text-xs text-blue-500 font-medium mb-0.5">연결된 특송</Text>
                              <Text className="text-blue-800 font-semibold text-sm" numberOfLines={1}>{song.title}</Text>
                            </View>
                          </View>
                          <Text className="text-blue-400 text-base">→</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* comments */}
                  <Text className="text-base font-bold text-gray-800 mb-3">
                    댓글{comments.length > 0 ? ` (${comments.length})` : ''}
                  </Text>
                  {comments.length === 0 && (
                    <Text className="text-gray-400 text-sm mb-3">첫 댓글을 남겨보세요.</Text>
                  )}
                  {comments.map((comment) => (
                    <View key={comment.id} className="bg-white rounded-xl p-3 mb-2 border border-gray-100">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-gray-700 text-xs font-semibold">
                          {comment.author?.name ?? '알 수 없음'}
                        </Text>
                        <View className="flex-row gap-3">
                          {comment.user_id === profile?.id && (
                            <TouchableOpacity onPress={() => startEditComment(comment)}>
                              <Text className="text-indigo-500 text-xs">수정</Text>
                            </TouchableOpacity>
                          )}
                          {(comment.user_id === profile?.id || isExecutive) && (
                            <TouchableOpacity onPress={() => handleDeleteComment(comment)}>
                              <Text className="text-red-400 text-xs">삭제</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text className="text-gray-800 text-sm">{comment.content}</Text>
                      <Text className="text-gray-400 text-xs mt-1">{fmt(comment.created_at)}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            {/* comment input */}
            <View className="bg-white border-t border-gray-100 px-4 py-3 flex-row items-end gap-2">
              {editingComment && (
                <TouchableOpacity
                  onPress={() => { setEditingComment(null); setCommentText(''); }}
                  className="py-2 px-1"
                >
                  <Text className="text-gray-400 text-sm">✕</Text>
                </TouchableOpacity>
              )}
              <TextInput
                ref={commentInputRef}
                value={commentText}
                onChangeText={setCommentText}
                placeholder={editingComment ? '댓글 수정...' : '댓글을 입력하세요...'}
                placeholderTextColor="#9ca3af"
                multiline
                className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm"
                style={{ maxHeight: 100, color: '#111827' }}
              />
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                className={`rounded-xl px-4 py-2 ${commentText.trim() ? 'bg-indigo-500' : 'bg-gray-200'}`}
              >
                <Text className={`text-sm font-semibold ${commentText.trim() ? 'text-white' : 'text-gray-400'}`}>
                  {editingComment ? '수정' : '등록'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── create modal ── */}
      <Modal visible={showCreateModal} animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text className="text-gray-500 text-base">취소</Text>
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">게시글 작성</Text>
              <TouchableOpacity onPress={handleCreate} disabled={submitting}>
                <Text className="text-indigo-600 text-base font-semibold">등록</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 p-5">
              <PostFormFields
                form={form}
                onChange={setForm}
                votes={votes}
                songs={songs}
                onCreateVote={() => { setShowCreateModal(false); openVoteCreate('create'); }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── edit modal ── */}
      <Modal visible={showEditModal} animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text className="text-gray-500 text-base">취소</Text>
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">게시글 수정</Text>
              <TouchableOpacity onPress={handleEdit} disabled={submitting}>
                <Text className="text-indigo-600 text-base font-semibold">저장</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="flex-1 p-5">
              <PostFormFields
                form={form}
                onChange={setForm}
                votes={votes}
                songs={songs}
                onCreateVote={() => { setShowEditModal(false); openVoteCreate('edit'); }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── vote create modal ── */}
      <VoteCreateModal
        visible={showVoteCreate}
        profile={profile}
        onCreated={handleVoteCreated}
        onClose={() => {
          setShowVoteCreate(false);
          if (pendingVoteTarget === 'create') setShowCreateModal(true);
          else if (pendingVoteTarget === 'edit') setShowEditModal(true);
          setPendingVoteTarget(null);
        }}
      />
    </SafeAreaView>
  );
}
