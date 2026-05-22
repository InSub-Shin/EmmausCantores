import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Song, SongFile } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SongsScreen() {
  const { profile } = useAuthStore();
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>(['']);
  const [youtubeTitles, setYoutubeTitles] = useState<string[]>(['전체']);
  const [files, setFiles] = useState<{ name: string; uri: string; type: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongDetail, setShowSongDetail] = useState(false);
  const [editingSong, setEditingSong] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [editYoutubeUrls, setEditYoutubeUrls] = useState<string[]>(['']);
  const [editYoutubeTitles, setEditYoutubeTitles] = useState<string[]>(['전체']);
  const [editFiles, setEditFiles] = useState<{ name: string; uri: string; type: string }[]>([]);

  const fetchSongs = useCallback(async () => {
    const { data } = await supabase
      .from('songs')
      .select('*, creator:profiles!created_by(name), files:song_files(*)')
      .order('created_at', { ascending: false });
    if (data) setSongs(data as unknown as Song[]);
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  const onRefresh = async () => { setRefreshing(true); await fetchSongs(); setRefreshing(false); };

  const pickFile = async (isEdit: boolean = false) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
    if (!result.canceled) {
      const newFiles = result.assets.map((a) => ({ name: a.name, uri: a.uri, type: a.mimeType ?? 'application/octet-stream' }));
      if (isEdit) {
        setEditFiles((prev) => [...prev, ...newFiles]);
      } else {
        setFiles((prev) => [...prev, ...newFiles]);
      }
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
    for (const file of files) {
      const path = `songs/${songData.id}/${Date.now()}_${file.name}`;
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { data: uploaded } = await supabase.storage.from('song-files').upload(path, blob, { contentType: file.type });
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('song-files').getPublicUrl(path);
        await supabase.from('song_files').insert({ song_id: songData.id, file_name: file.name, file_url: publicUrl, file_type: file.type });
      }
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

    // 새로운 파일 업로드
    for (const file of editFiles) {
      const path = `songs/${selectedSong!.id}/${Date.now()}_${file.name}`;
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { data: uploaded } = await supabase.storage.from('song-files').upload(path, blob, { contentType: file.type });
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('song-files').getPublicUrl(path);
        await supabase.from('song_files').insert({ song_id: selectedSong!.id, file_name: file.name, file_url: publicUrl, file_type: file.type });
      }
    }

    setEditingSong(false);
    setShowSongDetail(false);
    setSelectedSong(null);
    setEditFiles([]);
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
          // 모달 먼저 닫기
          setShowSongDetail(false);
          // 목록 새로고침
          await fetchSongs();
        },
      },
    ]);
  };

  const openSongDetail = (song: Song) => {
    setSelectedSong(song);
    setEditForm({ title: song.title, description: song.description || '' });
    setEditYoutubeUrls(song.youtube_links && song.youtube_links.length > 0 ? song.youtube_links : ['']);
    setEditYoutubeTitles(song.youtube_titles && song.youtube_titles.length > 0 ? song.youtube_titles : ['전체']);
    setEditFiles([]);
    setShowSongDetail(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
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

      {/* 특송 추가 모달 */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowCreate(false)}><Text className="text-gray-500">취소</Text></TouchableOpacity>
            <Text className="font-bold text-gray-900">특송 정보 추가</Text>
            <Button label="저장" size="sm" onPress={handleCreate} loading={saving} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Input label="곡 제목" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="특송 제목" />
            <Input label="설명 (선택)" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="설명" multiline />

            <Text className="text-sm font-medium text-gray-700 mb-2">유튜브 링크 (여러 개 가능)</Text>
            {youtubeUrls.map((url, idx) => {
              const currentTitle = youtubeTitles[idx] || '전체';
              const isCustom = !['전체', '소프라노', '알토', '테너', '베이스'].includes(currentTitle);
              return (
              <View key={idx} className="mb-3 pb-3 border-b border-gray-100">
                {/* 제목 선택 */}
                <Text className="text-xs text-gray-600 mb-1.5 font-medium">소제목</Text>
                <View className="flex-row gap-1.5 mb-2 flex-wrap">
                  {['전체', '소프라노', '알토', '테너', '베이스', '기타'].map((part) => (
                    <TouchableOpacity
                      key={part}
                      onPress={() => setYoutubeTitles((prev) => prev.map((t, i) => i === idx ? part : t))}
                      className={`px-2.5 py-1 rounded-full ${
                        (currentTitle === part || (part === '기타' && isCustom))
                          ? 'bg-red-500'
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`text-xs font-medium ${
                        (currentTitle === part || (part === '기타' && isCustom)) ? 'text-white' : 'text-gray-600'
                      }`}>
                        {part}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* 기타 선택 시 직접 입력 */}
                {(currentTitle === '기타' || isCustom) && (
                  <Input
                    placeholder="직접 입력..."
                    value={isCustom ? currentTitle : ''}
                    onChangeText={(v) => setYoutubeTitles((prev) => prev.map((t, i) => i === idx ? v : t))}
                  />
                )}

                {/* 링크 입력 */}
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
              onPress={() => {
                setYoutubeUrls((prev) => [...prev, '']);
                setYoutubeTitles((prev) => [...prev, '전체']);
              }}
              className="border border-dashed border-red-200 rounded-xl py-2 items-center mb-4"
            >
              <Text className="text-red-400 text-sm">+ 유튜브 링크 추가</Text>
            </TouchableOpacity>

            <Text className="text-sm font-medium text-gray-700 mb-2">파일 첨부 (PDF, 이미지)</Text>
            {files.map((f, i) => (
              <View key={i} className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 mb-2">
                <Text className="text-gray-600 flex-1 text-sm" numberOfLines={1}>📄 {f.name}</Text>
                <TouchableOpacity onPress={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Text className="text-red-400">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => pickFile(false)} className="border border-dashed border-gray-300 rounded-xl py-3 items-center">
              <Text className="text-gray-400 text-sm">+ 파일 선택</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 특송 상세보기 모달 */}
      <Modal visible={showSongDetail} animationType="slide" presentationStyle="pageSheet">
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
              <TouchableOpacity onPress={() => setEditingSong(false)}>
                <Text className="text-gray-500">취소</Text>
              </TouchableOpacity>
            )}
          </View>

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
                    key={idx}
                    onPress={() => Linking.openURL(url)}
                    className="flex-row items-center bg-red-50 rounded-xl px-3 py-2 mb-2"
                  >
                    <Text className="text-red-500 mr-2">▶</Text>
                    <Text className="text-red-600 text-sm flex-1" numberOfLines={1}>
                      {selectedSong?.youtube_links && selectedSong.youtube_links.length > 1
                        ? `유튜브 ${idx + 1}번 영상`
                        : '유튜브에서 보기'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {selectedSong?.files && selectedSong.files.length > 0 && (
                  <View className="mt-4">
                    {selectedSong.files.map((file: any) => (
                      <TouchableOpacity
                        key={file.id}
                        onPress={() => Linking.openURL(file.file_url)}
                        className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 mb-1"
                      >
                        <Text className="text-gray-500 mr-2">📄</Text>
                        <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>
                          {file.file_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Card>
            </ScrollView>
          ) : (
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

              <Text className="text-sm font-medium text-gray-700 mb-2">유튜브 링크 (여러 개 가능)</Text>
              {editYoutubeUrls.map((url, idx) => {
                const currentTitle = editYoutubeTitles[idx] || '전체';
                const isCustom = !['전체', '소프라노', '알토', '테너', '베이스'].includes(currentTitle);
                return (
                <View key={idx} className="mb-3 pb-3 border-b border-gray-100">
                  {/* 제목 선택 */}
                  <Text className="text-xs text-gray-600 mb-1.5 font-medium">소제목</Text>
                  <View className="flex-row gap-1.5 mb-2 flex-wrap">
                    {['전체', '소프라노', '알토', '테너', '베이스', '기타'].map((part) => (
                      <TouchableOpacity
                        key={part}
                        onPress={() => setEditYoutubeTitles((prev) => prev.map((t, i) => i === idx ? part : t))}
                        className={`px-2.5 py-1 rounded-full ${
                          (currentTitle === part || (part === '기타' && isCustom))
                            ? 'bg-red-500'
                            : 'bg-gray-200'
                        }`}
                      >
                        <Text className={`text-xs font-medium ${
                          (currentTitle === part || (part === '기타' && isCustom)) ? 'text-white' : 'text-gray-600'
                        }`}>
                          {part}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* 기타 선택 시 직접 입력 */}
                  {(currentTitle === '기타' || isCustom) && (
                    <Input
                      placeholder="직접 입력..."
                      value={isCustom ? currentTitle : ''}
                      onChangeText={(v) => setEditYoutubeTitles((prev) => prev.map((t, i) => i === idx ? v : t))}
                    />
                  )}

                  {/* 링크 입력 */}
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
                onPress={() => {
                  setEditYoutubeUrls((prev) => [...prev, '']);
                  setEditYoutubeTitles((prev) => [...prev, '전체']);
                }}
                className="border border-dashed border-red-200 rounded-xl py-2 items-center mb-4"
              >
                <Text className="text-red-400 text-sm">+ 유튜브 링크 추가</Text>
              </TouchableOpacity>

              <Text className="text-sm font-medium text-gray-700 mb-2">파일 첨부 (PDF, 이미지)</Text>
              {selectedSong?.files && selectedSong.files.length > 0 && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500 mb-1">기존 파일:</Text>
                  {selectedSong.files.map((file: any) => (
                    <View key={file.id} className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 mb-1">
                      <Text className="text-gray-500 mr-2">📄</Text>
                      <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>
                        {file.file_name}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {editFiles.length > 0 && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500 mb-1">새로 추가할 파일:</Text>
                  {editFiles.map((f, i) => (
                    <View key={i} className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 mb-2">
                      <Text className="text-gray-600 flex-1 text-sm" numberOfLines={1}>📄 {f.name}</Text>
                      <TouchableOpacity onPress={() => setEditFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Text className="text-red-400">✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity onPress={() => pickFile(true)} className="border border-dashed border-gray-300 rounded-xl py-3 items-center mb-4">
                <Text className="text-gray-400 text-sm">+ 파일 선택</Text>
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
              onPress={() => Linking.openURL(file.file_url)}
              className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 mb-1"
            >
              <Text className="text-gray-500 mr-2">📄</Text>
              <Text className="text-gray-700 text-sm flex-1" numberOfLines={1}>{file.file_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );
}
