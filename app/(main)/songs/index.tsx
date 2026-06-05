import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, ScrollView, Linking, BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useHomeNavigationStore } from '@/store/home-navigation';
import { Song, SongFile, SongReaction } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type FileItem = { name: string; uri: string; type: string; label: string };
const SHEET_PARTS = ['전체', '소프라노', '알토', '테너', '베이스'] as const;
const REACTION_EMOJIS = ['👏', '❤️', '🔥', '😊', '🎵', '🙏', '✨', '😭'] as const;

// 원본 파일명으로 다운로드되도록 download 쿼리 파라미터를 부착해 URL 열기
const openFileDownload = (file: { file_url: string; file_name: string }) => {
  const sep = file.file_url.includes('?') ? '&' : '?';
  Linking.openURL(`${file.file_url}${sep}download=${encodeURIComponent(file.file_name)}`);
};

export default function SongsScreen() {
  const { profile } = useAuthStore();
  const { selectedSong: homeSelectedSong, setSelectedSong: setHomeSelectedSong } = useHomeNavigationStore();
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(['']);
  const [youtubeTitles, setYoutubeTitles] = useState<string[]>(['전체']);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongDetail, setShowSongDetail] = useState(false);
  const [editingSong, setEditingSong] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [editYoutubeUrls, setEditYoutubeUrls] = useState<string[]>(['']);
  const [editYoutubeTitles, setEditYoutubeTitles] = useState<string[]>(['전체']);
  const [editFiles, setEditFiles] = useState<FileItem[]>([]);
  const [editFilesToDelete, setEditFilesToDelete] = useState<string[]>([]);

  const fetchSongs = useCallback(async () => {
    const { data } = await supabase
      .from('songs')
      .select('id, title, description, youtube_url, youtube_links, youtube_titles, created_by, created_at, creator:profiles!created_by(name), files:song_files(*), reactions:song_reactions(id, user_id, emoji)')
      .order('created_at', { ascending: false });
    if (data) setSongs(data as unknown as Song[]);
  }, []);

  useEffect(() => { fetchSongs(); }, []); // 초기 로드만

  // 안드로이드 뒤로가기: 모달 순서대로 닫기
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showCreate) { setShowCreate(false); return true; }
        if (showSongDetail) {
          if (editingSong) {
            setEditingSong(false);
            setEditFiles([]);
            setEditFilesToDelete([]);
            return true;
          }
          setShowSongDetail(false);
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [showCreate, showSongDetail, editingSong])
  );

  // 홈 화면에서 선택된 특송 자동으로 표시 (풀 데이터 fetch 후 모달 열기)
  useEffect(() => {
    if (homeSelectedSong) {
      const songId = homeSelectedSong.id;
      setHomeSelectedSong(null);
      setEditingSong(false);
      setEditFiles([]);
      setEditFilesToDelete([]);
      fetchSongDetail(songId).then((data) => {
          const song = data ?? homeSelectedSong;
          setSelectedSong(song);
          setEditForm({ title: song.title || '', description: song.description || '' });
          setEditYoutubeUrls(song.youtube_links && song.youtube_links.length > 0 ? song.youtube_links : ['']);
          setEditYoutubeTitles(song.youtube_titles && song.youtube_titles.length > 0 ? song.youtube_titles : ['전체']);
          setShowSongDetail(true);
        });
    }
  }, [homeSelectedSong]);

  const onRefresh = async () => { setRefreshing(true); await fetchSongs(); setRefreshing(false); };

  const pickFile = async (isEdit: boolean = false) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
    if (!result.canceled) {
      const newFiles = result.assets.map((a) => ({
        name: a.name,
        uri: a.uri,
        type: a.mimeType ?? 'application/octet-stream',
        label: '전체',
      }));
      if (isEdit) {
        setEditFiles((prev) => [...prev, ...newFiles]);
      } else {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    }
  };

  // 파일 1개를 스토리지에 업로드하고 song_files 레코드 생성. 실패 시 에러 메시지 반환.
  const uploadSongFile = async (songId: string, file: FileItem): Promise<string | null> => {
    try {
      // 스토리지 key는 ASCII만 허용 → 한글/공백/특수문자 제거하고 확장자만 보존
      const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const path = `songs/${songId}/${safeName}`;
      // Expo 새 File API로 로컬 파일을 바이트로 읽음 (fetch().blob()는 빈 blob 생성 이슈)
      const bytes = await new File(file.uri).bytes();
      if (!bytes || bytes.length === 0) return `${file.name}: 파일을 읽을 수 없습니다.`;

      const { error: uploadError } = await supabase.storage
        .from('song-files')
        .upload(path, bytes, { contentType: file.type, upsert: false });
      if (uploadError) return `${file.name}: ${uploadError.message}`;

      const { data: { publicUrl } } = supabase.storage.from('song-files').getPublicUrl(path);
      const { error: insertError } = await supabase.from('song_files').insert({
        song_id: songId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        label: file.label || '전체',
      });
      if (insertError) return `${file.name}: ${insertError.message}`;
      return null;
    } catch (e: any) {
      return `${file.name}: ${e?.message ?? '알 수 없는 오류'}`;
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { Alert.alert('입력 오류', '제목을 입력해주세요.'); return; }
    setSaving(true);

    const validUrls = youtubeUrls.map((u) => u.trim()).filter(Boolean);
    const validTitles = youtubeUrls.map((_, idx) => youtubeTitles[idx] || '전체').slice(0, validUrls.length);

    const { data: songData, error } = await supabase
      .from('songs')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        youtube_url: validUrls[0] || null,
        youtube_links: validUrls.length > 0 ? validUrls : null,
        youtube_titles: validUrls.length > 0 ? validTitles : null,
        created_by: profile?.id,
      })
      .select().single();

    if (error || !songData) { Alert.alert('오류', '특송 정보 추가에 실패했습니다.'); setSaving(false); return; }

    // 파일 업로드
    const uploadErrors: string[] = [];
    for (const file of files) {
      const err = await uploadSongFile(songData.id, file);
      if (err) uploadErrors.push(err);
    }
    if (uploadErrors.length > 0) {
      Alert.alert('일부 파일 업로드 실패', uploadErrors.join('\n'));
    }

    setShowCreate(false);
    setForm({ title: '', description: '' });
    setYoutubeUrls(['']);
    setYoutubeTitles(['전체']);
    setFiles([]);
    await fetchSongs();
    setSaving(false);
  };

  const handleEditSong = async () => {
    if (!editForm.title.trim()) {
      Alert.alert('입력 오류', '제목을 입력해주세요.');
      return;
    }
    setSaving(true);

    const validUrls = editYoutubeUrls.map((u) => u.trim()).filter(Boolean);
    const validTitles = editYoutubeUrls.map((_, idx) => editYoutubeTitles[idx] || '전체').slice(0, validUrls.length);

    const { error } = await supabase.from('songs').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      youtube_url: validUrls[0] || null,
      youtube_links: validUrls.length > 0 ? validUrls : null,
      youtube_titles: validUrls.length > 0 ? validTitles : null,
    }).eq('id', selectedSong!.id);

    if (error) {
      Alert.alert('오류', '특송 수정에 실패했습니다.');
      setSaving(false);
      return;
    }

    // 삭제 표시된 기존 파일 제거
    for (const fileId of editFilesToDelete) {
      await supabase.from('song_files').delete().eq('id', fileId);
    }

    // 새로운 파일 업로드
    const editUploadErrors: string[] = [];
    for (const file of editFiles) {
      const err = await uploadSongFile(selectedSong!.id, file);
      if (err) editUploadErrors.push(err);
    }
    if (editUploadErrors.length > 0) {
      Alert.alert('일부 파일 업로드 실패', editUploadErrors.join('\n'));
    }

    setEditingSong(false);
    setShowSongDetail(false);
    setSelectedSong(null);
    setEditFiles([]);
    setEditFilesToDelete([]);
    setEditYoutubeTitles(['전체']);
    await fetchSongs();
    setSaving(false);
  };

  const handleDeleteSong = async (songId: string) => {
    Alert.alert('삭제 확인', '이 특송을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('songs').delete().eq('id', songId);
          if (error) {
            Alert.alert('오류', '특송 삭제에 실패했습니다. ' + error.message);
            return;
          }
          setShowSongDetail(false);
          await fetchSongs();
        },
      },
    ]);
  };

  const fetchSongDetail = async (songId: string) => {
    const { data } = await supabase
      .from('songs')
      .select('*, files:song_files(*), creator:profiles!created_by(name), reactions:song_reactions(id, user_id, emoji)')
      .eq('id', songId)
      .single();
    return data as unknown as Song | null;
  };

  const openSongDetail = async (song: Song) => {
    setEditingSong(false);
    setEditFiles([]);
    setEditFilesToDelete([]);
    const fullSong = (await fetchSongDetail(song.id)) ?? song;
    setSelectedSong(fullSong);
    setEditForm({ title: fullSong.title, description: fullSong.description || '' });
    setEditYoutubeUrls(fullSong.youtube_links && fullSong.youtube_links.length > 0 ? fullSong.youtube_links : ['']);
    setEditYoutubeTitles(fullSong.youtube_titles && fullSong.youtube_titles.length > 0 ? fullSong.youtube_titles : ['전체']);
    setShowSongDetail(true);
  };

  const handleToggleReaction = async (emoji: string) => {
    if (!selectedSong || !profile) return;
    const existing = selectedSong.reactions?.find((r) => r.user_id === profile.id && r.emoji === emoji);
    if (existing) {
      await supabase.from('song_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('song_reactions').insert({ song_id: selectedSong.id, user_id: profile.id, emoji });
    }
    const updated = await fetchSongDetail(selectedSong.id);
    if (updated) {
      setSelectedSong(updated);
      setSongs((prev) => prev.map((s) => s.id === updated.id ? { ...s, reactions: updated.reactions } : s));
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">특송 정보</Text>
        {profile?.is_executive && (
          <TouchableOpacity onPress={() => setShowCreate(true)} className="bg-indigo-600 rounded-xl px-4 py-2">
            <Text className="text-white font-medium text-sm">+ 추가</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 검색 */}
      <View className="px-5 pb-2">
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="곡 제목 검색..."
        />
      </View>

      <FlatList
        data={songs.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-gray-400">
              {searchQuery ? '검색 결과가 없습니다' : '등록된 특송 정보가 없습니다'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openSongDetail(item)}>
            <SongCard song={item} />
          </TouchableOpacity>
        )}
      />

      {/* ── 특송 추가 모달 ── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowCreate(false)}><Text className="text-gray-500">취소</Text></TouchableOpacity>
            <Text className="font-bold text-gray-900">특송 정보 추가</Text>
            <Button label="저장" size="sm" onPress={handleCreate} loading={saving} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Input label="곡 제목" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="특송 제목" />
            <Input label="설명 (선택)" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="설명" multiline />

            {/* 유튜브 링크 */}
            <Text className="text-sm font-medium text-gray-700 mb-2">유튜브 링크 (여러 개 가능)</Text>
            {youtubeUrls.map((url, idx) => {
              const currentTitle = youtubeTitles[idx] || '전체';
              const isCustom = !['전체', '소프라노', '알토', '테너', '베이스'].includes(currentTitle);
              return (
                <View key={`yt-create-${idx}`} className="mb-3 pb-3 border-b border-gray-100">
                  <Text className="text-xs text-gray-600 mb-1.5 font-medium">소제목</Text>
                  <View className="flex-row gap-1.5 mb-2 flex-wrap">
                    {['전체', '소프라노', '알토', '테너', '베이스', '기타'].map((part) => (
                      <TouchableOpacity
                        key={part}
                        onPress={() => setYoutubeTitles((prev) => prev.map((t, i) => i === idx ? part : t))}
                        className={`px-2.5 py-1 rounded-full ${(currentTitle === part || (part === '기타' && isCustom)) ? 'bg-red-500' : 'bg-gray-200'}`}
                      >
                        <Text className={`text-xs font-medium ${(currentTitle === part || (part === '기타' && isCustom)) ? 'text-white' : 'text-gray-600'}`}>
                          {part}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {(currentTitle === '기타' || isCustom) && (
                    <Input
                      placeholder="직접 입력..."
                      value={isCustom ? currentTitle : ''}
                      onChangeText={(v) => setYoutubeTitles((prev) => prev.map((t, i) => i === idx ? v : t))}
                    />
                  )}
                  <Text className="text-xs text-gray-600 mb-1.5 font-medium mt-2">링크</Text>
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <Input
                        value={url}
                        onChangeText={(v) => setYoutubeUrls((prev) => prev.map((u, i) => i === idx ? v : u))}
                        placeholder="https://youtube.com/..."
                      />
                    </View>
                    {youtubeUrls.length > 1 && (
                      <TouchableOpacity onPress={() => {
                        setYoutubeUrls((prev) => prev.filter((_, i) => i !== idx));
                        setYoutubeTitles((prev) => prev.filter((_, i) => i !== idx));
                      }}>
                        <Text className="text-red-400 text-lg pb-4">✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
            <TouchableOpacity
              onPress={() => { setYoutubeUrls((prev) => [...prev, '']); setYoutubeTitles((prev) => [...prev, '전체']); }}
              className="border border-dashed border-red-200 rounded-xl py-2 items-center mb-4"
            >
              <Text className="text-red-400 text-sm">+ 유튜브 링크 추가</Text>
            </TouchableOpacity>

            {/* 악보 파일 */}
            <Text className="text-sm font-medium text-gray-700 mb-2">🎼 악보 파일 (여러 파트 가능)</Text>
            {files.map((f, i) => (
              <View key={`file-create-${i}`} className="mb-3 pb-3 border-b border-gray-100">
                <Text className="text-xs text-gray-600 mb-1.5 font-medium">파트</Text>
                <View className="flex-row gap-1.5 mb-2 flex-wrap">
                  {SHEET_PARTS.map((part) => (
                    <TouchableOpacity
                      key={part}
                      onPress={() => setFiles((prev) => prev.map((file, fi) => fi === i ? { ...file, label: part } : file))}
                      className={`px-2.5 py-1 rounded-full ${f.label === part ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                      <Text className={`text-xs font-medium ${f.label === part ? 'text-white' : 'text-gray-600'}`}>{part}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2">
                  <Text className="text-indigo-400 mr-2">🎼</Text>
                  <Text className="text-gray-600 flex-1 text-sm" numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2">
                    <Text className="text-red-400">✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => pickFile(false)} className="border border-dashed border-indigo-200 rounded-xl py-3 items-center">
              <Text className="text-indigo-400 text-sm">+ 악보 파일 선택</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── 특송 상세보기 모달 ── */}
      <Modal
        visible={showSongDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (editingSong) { setEditingSong(false); setEditFiles([]); setEditFilesToDelete([]); }
          else { setShowSongDetail(false); }
        }}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setShowSongDetail(false); setEditingSong(false); }}>
              <Text className="text-gray-500">닫기</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">{editingSong ? '특송 수정' : '특송 상세'}</Text>
            {!editingSong && (profile?.is_executive || profile?.id === selectedSong?.created_by) && (
              <TouchableOpacity onPress={() => setEditingSong(true)}>
                <Text className="text-indigo-600 font-medium">수정</Text>
              </TouchableOpacity>
            )}
            {editingSong && (
              <TouchableOpacity onPress={() => { setEditingSong(false); setEditFiles([]); setEditFilesToDelete([]); }}>
                <Text className="text-gray-500">취소</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 상세 보기 */}
          {!editingSong ? (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Card className="mb-4">
                <Text className="text-2xl font-bold text-gray-900 mb-2">{selectedSong?.title}</Text>
                {selectedSong?.description && (
                  <Text className="text-gray-600 text-sm mb-4">{selectedSong.description}</Text>
                )}
                {(selectedSong?.youtube_links && selectedSong.youtube_links.length > 0
                  ? selectedSong.youtube_links
                  : selectedSong?.youtube_url ? [selectedSong.youtube_url] : []
                ).map((url, idx) => (
                  <TouchableOpacity
                    key={`yt-detail-${selectedSong?.id}-${idx}`}
                    onPress={() => Linking.openURL(url)}
                    className="flex-row items-center bg-red-50 rounded-xl px-3 py-2 mb-2"
                  >
                    <Text className="text-red-500 mr-2">▶</Text>
                    <Text className="text-red-600 text-sm flex-1" numberOfLines={1}>
                      {selectedSong?.youtube_titles && selectedSong.youtube_titles[idx]
                        ? selectedSong.youtube_titles[idx]
                        : selectedSong?.youtube_links && selectedSong.youtube_links.length > 1
                        ? `유튜브 ${idx + 1}번 영상`
                        : '유튜브에서 보기'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {selectedSong?.files && selectedSong.files.length > 0 && (
                  <View className="mt-3">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">🎼 악보</Text>
                    {selectedSong.files.map((file: any) => (
                      <TouchableOpacity
                        key={file.id}
                        onPress={() => openFileDownload(file)}
                        className="flex-row items-center bg-indigo-50 rounded-xl px-3 py-2 mb-1"
                      >
                        <Text className="text-indigo-400 mr-2">🎼</Text>
                        <View className="flex-1">
                          {file.label && file.label !== '전체' && (
                            <Text className="text-xs text-indigo-600 font-medium">{file.label}</Text>
                          )}
                          <Text className="text-indigo-700 text-sm" numberOfLines={1}>{file.file_name}</Text>
                        </View>
                        <Text className="text-indigo-400 text-xs ml-2">다운로드 ↓</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {/* 이모지 반응 */}
                <View className="mt-4 pt-4 border-t border-gray-100">
                  <Text className="text-xs font-semibold text-gray-500 mb-2">반응</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {REACTION_EMOJIS.map((emoji) => {
                        const count = selectedSong?.reactions?.filter((r) => r.emoji === emoji).length ?? 0;
                        const reacted = selectedSong?.reactions?.some((r) => r.user_id === profile?.id && r.emoji === emoji) ?? false;
                        return (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() => handleToggleReaction(emoji)}
                            className={`flex-row items-center px-3 py-1.5 rounded-full border ${reacted ? 'bg-indigo-100 border-indigo-400' : 'bg-gray-100 border-gray-200'}`}
                          >
                            <Text className="text-base">{emoji}</Text>
                            {count > 0 && (
                              <Text className={`text-xs font-semibold ml-1 ${reacted ? 'text-indigo-700' : 'text-gray-500'}`}>{count}</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </Card>
            </ScrollView>
          ) : (
            /* 수정 모드 */
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Input
                label="곡 제목"
                value={editForm.title}
                onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))}
                placeholder="특송 제목"
              />
              <Input
                label="설명 (선택)"
                value={editForm.description}
                onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))}
                placeholder="설명"
                multiline
              />

              {/* 유튜브 링크 */}
              <Text className="text-sm font-medium text-gray-700 mb-2">유튜브 링크 (여러 개 가능)</Text>
              {editYoutubeUrls.map((url, idx) => {
                const currentTitle = editYoutubeTitles[idx] || '전체';
                const isCustom = !['전체', '소프라노', '알토', '테너', '베이스'].includes(currentTitle);
                return (
                  <View key={`yt-edit-${selectedSong?.id}-${idx}`} className="mb-3 pb-3 border-b border-gray-100">
                    <Text className="text-xs text-gray-600 mb-1.5 font-medium">소제목</Text>
                    <View className="flex-row gap-1.5 mb-2 flex-wrap">
                      {['전체', '소프라노', '알토', '테너', '베이스', '기타'].map((part) => (
                        <TouchableOpacity
                          key={part}
                          onPress={() => setEditYoutubeTitles((prev) => prev.map((t, i) => i === idx ? part : t))}
                          className={`px-2.5 py-1 rounded-full ${(currentTitle === part || (part === '기타' && isCustom)) ? 'bg-red-500' : 'bg-gray-200'}`}
                        >
                          <Text className={`text-xs font-medium ${(currentTitle === part || (part === '기타' && isCustom)) ? 'text-white' : 'text-gray-600'}`}>
                            {part}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {(currentTitle === '기타' || isCustom) && (
                      <Input
                        placeholder="직접 입력..."
                        value={isCustom ? currentTitle : ''}
                        onChangeText={(v) => setEditYoutubeTitles((prev) => prev.map((t, i) => i === idx ? v : t))}
                      />
                    )}
                    <Text className="text-xs text-gray-600 mb-1.5 font-medium mt-2">링크</Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <Input
                          value={url}
                          onChangeText={(v) => setEditYoutubeUrls((prev) => prev.map((u, i) => (i === idx ? v : u)))}
                          placeholder="https://youtube.com/..."
                        />
                      </View>
                      {editYoutubeUrls.length > 1 && (
                        <TouchableOpacity onPress={() => {
                          setEditYoutubeUrls((prev) => prev.filter((_, i) => i !== idx));
                          setEditYoutubeTitles((prev) => prev.filter((_, i) => i !== idx));
                        }}>
                          <Text className="text-red-400 text-lg pb-4">✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity
                onPress={() => { setEditYoutubeUrls((prev) => [...prev, '']); setEditYoutubeTitles((prev) => [...prev, '전체']); }}
                className="border border-dashed border-red-200 rounded-xl py-2 items-center mb-4"
              >
                <Text className="text-red-400 text-sm">+ 유튜브 링크 추가</Text>
              </TouchableOpacity>

              {/* 악보 파일 */}
              <Text className="text-sm font-medium text-gray-700 mb-2">🎼 악보 파일</Text>

              {/* 기존 악보 (삭제 가능) */}
              {selectedSong?.files && selectedSong.files.filter((f: any) => !editFilesToDelete.includes(f.id)).length > 0 && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-1">기존 악보:</Text>
                  {selectedSong.files
                    .filter((f: any) => !editFilesToDelete.includes(f.id))
                    .map((file: any) => (
                      <View key={file.id} className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 mb-1">
                        <Text className="text-indigo-400 mr-2">🎼</Text>
                        <View className="flex-1">
                          {file.label && file.label !== '전체' && (
                            <Text className="text-xs text-indigo-600 font-medium">{file.label}</Text>
                          )}
                          <Text className="text-gray-700 text-sm" numberOfLines={1}>{file.file_name}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setEditFilesToDelete((prev) => [...prev, file.id])} className="ml-2 p-1">
                          <Text className="text-red-400">✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                </View>
              )}

              {/* 새로 추가할 악보 (파트 선택) */}
              {editFiles.map((f, i) => (
                <View key={`edit-file-${i}`} className="mb-3 pb-3 border-b border-gray-100">
                  <Text className="text-xs text-gray-600 mb-1.5 font-medium">파트</Text>
                  <View className="flex-row gap-1.5 mb-2 flex-wrap">
                    {SHEET_PARTS.map((part) => (
                      <TouchableOpacity
                        key={part}
                        onPress={() => setEditFiles((prev) => prev.map((file, fi) => fi === i ? { ...file, label: part } : file))}
                        className={`px-2.5 py-1 rounded-full ${f.label === part ? 'bg-indigo-600' : 'bg-gray-200'}`}
                      >
                        <Text className={`text-xs font-medium ${f.label === part ? 'text-white' : 'text-gray-600'}`}>{part}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2">
                    <Text className="text-indigo-400 mr-2">🎼</Text>
                    <Text className="text-gray-600 flex-1 text-sm" numberOfLines={1}>{f.name}</Text>
                    <TouchableOpacity onPress={() => setEditFiles((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2">
                      <Text className="text-red-400">✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity onPress={() => pickFile(true)} className="border border-dashed border-indigo-200 rounded-xl py-3 items-center mb-4">
                <Text className="text-indigo-400 text-sm">+ 악보 파일 선택</Text>
              </TouchableOpacity>

              <View className="flex-row gap-3">
                <Button
                  label="삭제"
                  variant="outline"
                  onPress={() => handleDeleteSong(selectedSong!.id)}
                  className="flex-1"
                />
                <Button
                  label="저장"
                  onPress={handleEditSong}
                  loading={saving}
                  className="flex-1"
                />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SongCard({ song }: { song: Song }) {
  return (
    <Card className="mb-3">
      <Text className="text-base font-bold text-gray-900 mb-1">{song.title}</Text>
      {song.description && <Text className="text-sm text-gray-500 mb-2">{song.description}</Text>}
      <Text className="text-xs text-gray-400 mb-3">
        {(song.creator as { name?: string } | undefined)?.name} · {format(new Date(song.created_at), 'M월 d일', { locale: ko })}
      </Text>

      {(song.youtube_links && song.youtube_links.length > 0
        ? song.youtube_links
        : song.youtube_url ? [song.youtube_url] : []
      ).map((url, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={() => Linking.openURL(url)}
          className="flex-row items-center bg-red-50 rounded-xl px-3 py-2 mb-2"
        >
          <Text className="text-red-500 mr-2">▶</Text>
          <Text className="text-red-600 text-sm flex-1" numberOfLines={1}>
            {song.youtube_titles && song.youtube_titles[idx]
              ? song.youtube_titles[idx]
              : song.youtube_links && song.youtube_links.length > 1
              ? `유튜브 ${idx + 1}번 영상`
              : '유튜브에서 보기'}
          </Text>
        </TouchableOpacity>
      ))}

      {song.files && song.files.length > 0 && (
        <View>
          {song.files.map((file: SongFile) => (
            <TouchableOpacity
              key={file.id}
              onPress={() => openFileDownload(file)}
              className="flex-row items-center bg-indigo-50 rounded-xl px-3 py-2 mb-1"
            >
              <Text className="text-indigo-400 mr-2">🎼</Text>
              <Text className="text-indigo-700 text-sm flex-1" numberOfLines={1}>
                {file.label && file.label !== '전체' ? `[${file.label}] ` : ''}{file.file_name}
              </Text>
              <Text className="text-indigo-400 text-xs ml-2">↓</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {song.reactions && song.reactions.length > 0 && (() => {
        const counts: Record<string, number> = {};
        for (const r of song.reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
        const entries = REACTION_EMOJIS.filter((e) => counts[e]).map((e) => ({ emoji: e, count: counts[e] }));
        if (!entries.length) return null;
        return (
          <View className="flex-row flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
            {entries.map(({ emoji, count }) => (
              <View key={emoji} className="flex-row items-center bg-gray-100 rounded-full px-2 py-0.5">
                <Text className="text-sm">{emoji}</Text>
                <Text className="text-xs text-gray-500 ml-0.5 font-medium">{count}</Text>
              </View>
            ))}
          </View>
        );
      })()}
    </Card>
  );
}
