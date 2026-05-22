import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Alert, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Vote, VoteItem, Profile, PART_LABELS, Part } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sendPushToUsers } from '@/lib/notifications';

export default function VoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const [vote, setVote] = useState<Vote | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [allMembers, setAllMembers] = useState<Profile[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [editVoteItems, setEditVoteItems] = useState<string[]>(['', '']);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchVote = useCallback(async () => {
    const { data } = await supabase
      .from('votes')
      .select(`*, creator:profiles!created_by(name), items:vote_items(*, responses:vote_responses(*, profile:profiles(id, name, part))), schedule:schedules(id, title)`)
      .eq('id', id)
      .single();
    if (data) setVote(data as unknown as Vote);
  }, [id]);

  useEffect(() => {
    fetchVote();
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) setAllMembers(data as Profile[]);
    });
  }, [fetchVote]);

  const myResponses = vote?.items?.flatMap((i) => i.responses?.filter((r) => r.user_id === profile?.id) ?? []) ?? [];
  const hasVoted = myResponses.length > 0;
  const isExpired = vote?.ends_at ? new Date(vote.ends_at) < new Date() : false;

  const voterIds = new Set(vote?.items?.flatMap((i) => i.responses?.map((r) => r.user_id) ?? []) ?? []);
  const nonVoters = allMembers.filter((m) => !voterIds.has(m.id));

  // 미참여자 알림 권한: 투표 작성자 또는 임원진
  const canNotifyNonVoters = profile?.is_executive || profile?.id === vote?.created_by;

  // 투표 수정/삭제 권한: 투표 작성자 또는 임원진
  const canEditVote = profile?.is_executive || profile?.id === vote?.created_by;

  // 사용자별 투표한 항목 찾기
  const getUserVotes = (userId: string) => {
    return vote?.items
      ?.filter((item) => item.responses?.some((r) => r.user_id === userId))
      ?.map((item) => item.label) ?? [];
  };

  const handleVote = async () => {
    if (!vote || !profile || selected.length === 0) return;
    setSubmitting(true);

    await supabase.from('vote_responses').delete()
      .eq('vote_id', vote.id).eq('user_id', profile.id);

    const rows = selected.map((itemId) => ({
      vote_id: vote.id,
      vote_item_id: itemId,
      user_id: profile.id,
    }));

    const { error } = await supabase.from('vote_responses').insert(rows);
    if (error) Alert.alert('오류', '투표에 실패했습니다.');
    else await fetchVote();

    setSubmitting(false);
    setSelected([]);
  };

  const handleNotifyNonVoters = async () => {
    setNotifying(true);
    const tokens = nonVoters.map((m) => m.push_token).filter(Boolean) as string[];
    if (tokens.length === 0) {
      Alert.alert('알림', '미참여 단원 중 알림을 받을 수 있는 분이 없습니다.');
      setNotifying(false);
      return;
    }
    await sendPushToUsers(tokens, '투표 참여 요청', `"${vote?.title}" 투표에 아직 참여하지 않으셨습니다. 참여해주세요!`);
    Alert.alert('완료', `${tokens.length}명에게 알림을 보냈습니다.`);
    setNotifying(false);
  };

  const toggleSelect = (itemId: string) => {
    if (vote?.multiple_choice) {
      setSelected((prev) => prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]);
    } else {
      setSelected([itemId]);
    }
  };

  const openEditModal = () => {
    if (!vote) return;
    setEditForm({ title: vote.title, description: vote.description || '' });
    setEditVoteItems(vote.items?.map((item) => item.label) || ['', '']);
    setIsEditing(true);
  };

  const handleEditVote = async () => {
    if (!editForm.title.trim() || editVoteItems.filter(Boolean).length < 2) {
      Alert.alert('입력 오류', '투표 제목과 최소 2개의 항목을 입력해주세요.');
      return;
    }
    if (!vote) return;
    setSavingEdit(true);

    // 투표 업데이트
    const { error: updateError } = await supabase.from('votes').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
    }).eq('id', vote.id);

    if (updateError) {
      Alert.alert('오류', '투표 수정에 실패했습니다.');
      setSavingEdit(false);
      return;
    }

    // 기존 항목과 새 항목 비교
    const existingItems = vote.items || [];
    const newItems = editVoteItems.filter(Boolean);

    // 기존 항목 중 삭제된 것 제거 (응답이 없는 경우만)
    for (const existingItem of existingItems) {
      if (!newItems.includes(existingItem.label)) {
        const hasResponses = (existingItem.responses?.length ?? 0) > 0;
        if (!hasResponses) {
          await supabase.from('vote_items').delete().eq('id', existingItem.id);
        }
      }
    }

    // 새로운 항목 추가
    const existingLabels = existingItems.map((item) => item.label);
    for (let i = 0; i < newItems.length; i++) {
      if (!existingLabels.includes(newItems[i])) {
        await supabase.from('vote_items').insert({
          vote_id: vote.id,
          label: newItems[i],
          order_index: i,
        });
      }
    }

    // 기존 항목 순서 업데이트
    for (let i = 0; i < existingItems.length; i++) {
      if (newItems.includes(existingItems[i].label)) {
        await supabase.from('vote_items').update({ order_index: newItems.indexOf(existingItems[i].label) })
          .eq('id', existingItems[i].id);
      }
    }

    setIsEditing(false);
    await fetchVote();
    Alert.alert('완료', '투표가 수정되었습니다.');
    setSavingEdit(false);
    // 일정 화면도 새로고침 (연동된 일정이 있을 경우)
    if (vote?.schedule) {
      // 부모 화면에 알림 (선택사항)
    }
  };

  const handleDeleteVote = () => {
    Alert.alert('투표 삭제', '이 투표를 정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            // 투표 응답 삭제
            const { error: responseError } = await supabase.from('vote_responses').delete().eq('vote_id', vote!.id);
            if (responseError) throw responseError;

            // 투표 항목 삭제
            const { error: itemError } = await supabase.from('vote_items').delete().eq('vote_id', vote!.id);
            if (itemError) throw itemError;

            // 투표 삭제
            const { error: voteDeleteError } = await supabase.from('votes').delete().eq('id', vote!.id);
            if (voteDeleteError) throw voteDeleteError;

            Alert.alert('완료', '투표가 삭제되었습니다.');
            router.back();
          } catch (error: any) {
            console.error('Delete vote error:', error);
            Alert.alert('오류', `투표 삭제에 실패했습니다.\n${error.message}`);
          }
        },
      },
    ]);
  };

  if (!vote) return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
      <Text className="text-gray-400">불러오는 중...</Text>
    </SafeAreaView>
  );

  const totalVoters = voterIds.size;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-indigo-600 text-base">← 뒤로</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">투표</Text>
        </View>
        <View className="flex-row gap-2">
          {vote?.schedule && (
            <TouchableOpacity onPress={() => router.push(`/(main)/schedule`)}>
              <Text className="text-purple-600 font-medium text-sm">📅 일정</Text>
            </TouchableOpacity>
          )}
          {canEditVote && !isEditing && (
            <>
              <TouchableOpacity onPress={openEditModal}>
                <Text className="text-indigo-600 font-medium text-sm">수정</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteVote}>
                <Text className="text-red-600 font-medium text-sm">삭제</Text>
              </TouchableOpacity>
            </>
          )}
          {isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <Text className="text-gray-500 font-medium text-sm">취소</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {!isEditing ? (
          <>
            <Card className="mb-4">
              <Text className="text-xl font-bold text-gray-900 mb-2">{vote.title}</Text>
              {vote.description && <Text className="text-gray-500 text-sm mb-3">{vote.description}</Text>}
              <View className="flex-row flex-wrap gap-2">
                {vote.multiple_choice && <Text className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">복수선택</Text>}
                {isExpired && <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">종료됨</Text>}
                {vote.ends_at && (
                  <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                    ~{format(new Date(vote.ends_at), 'M월 d일 HH:mm', { locale: ko })}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center justify-between mt-3">
                <Text className="text-sm text-gray-500">총 {totalVoters}명 참여</Text>
                <TouchableOpacity onPress={() => setShowParticipants(true)} className="bg-indigo-50 px-3 py-1 rounded-lg">
                  <Text className="text-xs text-indigo-600 font-medium">참여자 현황</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* 투표 항목 */}
            <Text className="text-base font-semibold text-gray-800 mb-3">투표 항목</Text>
          </>
        ) : (
          <>
            <Input
              label="투표 제목"
              value={editForm.title}
              onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))}
              placeholder="투표 제목"
            />
            <Input
              label="설명 (선택)"
              value={editForm.description}
              onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))}
              placeholder="투표 설명"
              multiline
            />
            <Text className="text-sm font-medium text-gray-700 mb-2 mt-2">투표 항목 (최소 2개)</Text>
            {editVoteItems.map((item, idx) => {
              const hasResponses = vote?.items?.[idx]?.responses && (vote.items[idx].responses?.length ?? 0) > 0;
              const responseCount = vote?.items?.[idx]?.responses?.length ?? 0;
              return (
                <View key={idx}>
                  {hasResponses && (
                    <Text className="text-xs text-red-500 mb-1 ml-1">
                      ⚠️ {responseCount}명이 투표했으므로 수정/삭제 불가
                    </Text>
                  )}
                  <View className="flex-row items-center gap-2 mb-2">
                    <View className="flex-1">
                      <Input
                        value={item}
                        onChangeText={(v) => !hasResponses && setEditVoteItems((prev) => prev.map((i, i_idx) => i_idx === idx ? v : i))}
                        placeholder={`항목 ${idx + 1}`}
                        editable={!hasResponses}
                      />
                    </View>
                    {editVoteItems.length > 2 && (
                      <TouchableOpacity
                        disabled={hasResponses}
                        onPress={() => setEditVoteItems((prev) => prev.filter((_, i) => i !== idx))}
                        className={`justify-center pb-2 ${hasResponses ? 'opacity-30' : ''}`}
                      >
                        <Text className={`text-lg ${hasResponses ? 'text-gray-300' : 'text-red-400'}`}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
            <TouchableOpacity
              onPress={() => setEditVoteItems((prev) => [...prev, ''])}
              className="border border-dashed border-indigo-200 rounded-xl py-2 items-center mb-4"
            >
              <Text className="text-indigo-400 text-sm">+ 항목 추가</Text>
            </TouchableOpacity>

            <Text className="text-xs text-gray-500 mb-4">
              💡 팁: 이미 투표가 있는 항목은 삭제할 수 없습니다.
            </Text>

            <View className="flex-row gap-3">
              <Button
                label="저장"
                onPress={handleEditVote}
                loading={savingEdit}
                className="flex-1"
              />
            </View>

            <Text className="text-base font-semibold text-gray-800 mb-3 mt-6">현재 투표 항목</Text>
          </>
        )}
        {vote.items?.map((item) => {
          const itemVoters = item.responses?.length ?? 0;
          const pct = totalVoters > 0 ? Math.round((itemVoters / totalVoters) * 100) : 0;
          const isSelected = selected.includes(item.id);
          const myVoted = myResponses.some((r) => r.vote_item_id === item.id);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => !hasVoted && !isExpired && !isEditing ? toggleSelect(item.id) : null}
              className="mb-3"
              activeOpacity={hasVoted || isExpired || isEditing ? 1 : 0.7}
            >
              <Card className={`${isSelected ? 'border-indigo-400' : ''} ${myVoted ? 'border-green-400' : ''}`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    {(!hasVoted && !isExpired && !isEditing) && (
                      <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                        {isSelected && <View className="w-2 h-2 bg-white rounded-full" />}
                      </View>
                    )}
                    {myVoted && !isEditing && <Text className="text-green-600 text-sm">✓</Text>}
                    <Text className="text-base font-medium text-gray-900 flex-1">{item.label}</Text>
                  </View>
                  {!isEditing && <Text className="text-sm text-gray-500">{itemVoters}명 ({pct}%)</Text>}
                </View>

                {!isEditing && (
                  <>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                    </View>

                    {/* 투표한 사람 목록 (임원에게만 표시) */}
                    {profile?.is_executive && item.responses && item.responses.length > 0 && (
                      <View className="mt-2 flex-row flex-wrap gap-1">
                        {item.responses.map((r) => (
                          <Text key={r.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {(r.profile as Profile | undefined)?.name ?? '익명'}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </Card>
            </TouchableOpacity>
          );
        })}

        {!isEditing && (
          <>
            {!hasVoted && !isExpired && (
              <Button
                label="투표하기"
                onPress={handleVote}
                loading={submitting}
                disabled={selected.length === 0}
                className="mt-2"
              />
            )}

            {/* 미참여자 알림 (투표 작성자 또는 임원진만 가능) */}
            {canNotifyNonVoters && nonVoters.length > 0 && (
              <Card className="mt-6">
                <Text className="text-sm font-semibold text-gray-800 mb-2">미참여 단원 ({nonVoters.length}명)</Text>
                <View className="flex-row flex-wrap gap-1 mb-3">
                  {nonVoters.map((m) => (
                    <Text key={m.id} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full">{m.name}</Text>
                  ))}
                </View>
                <Button
                  label="미참여자에게 알림 보내기"
                  variant="outline"
                  size="sm"
                  onPress={handleNotifyNonVoters}
                  loading={notifying}
                />
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {/* 참여자 현황 모달 */}
      <Modal visible={showParticipants} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowParticipants(false)}>
              <Text className="text-gray-500">닫기</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">참여자 현황</Text>
            <View className="w-10" />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* 통계 */}
            <View className="flex-row gap-3 mb-6">
              <Card className="flex-1 bg-indigo-50">
                <Text className="text-xs text-indigo-600 font-medium">전체</Text>
                <Text className="text-2xl font-bold text-indigo-900 mt-1">{allMembers.length}</Text>
                <Text className="text-xs text-indigo-600 mt-1">명</Text>
              </Card>
              <Card className="flex-1 bg-green-50">
                <Text className="text-xs text-green-600 font-medium">참여</Text>
                <Text className="text-2xl font-bold text-green-900 mt-1">{totalVoters}</Text>
                <Text className="text-xs text-green-600 mt-1">명</Text>
              </Card>
              <Card className="flex-1 bg-red-50">
                <Text className="text-xs text-red-600 font-medium">미참여</Text>
                <Text className="text-2xl font-bold text-red-900 mt-1">{nonVoters.length}</Text>
                <Text className="text-xs text-red-600 mt-1">명</Text>
              </Card>
            </View>

            {/* 파트별 현황 */}
            <Text className="text-base font-semibold text-gray-800 mb-3">파트별 참여 현황</Text>
            {(['soprano', 'alto', 'tenor', 'bass'] as Part[]).map((part) => {
              const partMembers = allMembers.filter((m) => m.part === part);
              const partVoters = partMembers.filter((m) => voterIds.has(m.id));

              return (
                <Card key={part} className="mb-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-semibold text-gray-900">{PART_LABELS[part]}</Text>
                    <Text className="text-xs text-gray-500">
                      {partVoters.length}명 / {partMembers.length}명
                    </Text>
                  </View>

                  {/* 참여자 */}
                  {partVoters.length > 0 && (
                    <View className="mb-2">
                      <Text className="text-xs text-green-600 font-medium mb-1.5">✓ 참여 ({partVoters.length})</Text>
                      <View className="gap-1">
                        {partVoters.map((m) => {
                          const votes = getUserVotes(m.id);
                          return (
                            <View key={m.id} className="bg-green-50 rounded px-2 py-1.5">
                              <Text className="text-xs font-medium text-green-700">{m.name}</Text>
                              {votes.length > 0 && (
                                <Text className="text-xs text-green-600 mt-0.5">
                                  {votes.join(', ')}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* 미참여자 */}
                  {partMembers.filter((m) => !voterIds.has(m.id)).length > 0 && (
                    <View>
                      <Text className="text-xs text-red-600 font-medium mb-1">✕ 미참여</Text>
                      <View className="flex-row flex-wrap gap-1">
                        {partMembers
                          .filter((m) => !voterIds.has(m.id))
                          .map((m) => (
                            <Text key={m.id} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                              {m.name}
                            </Text>
                          ))}
                      </View>
                    </View>
                  )}
                </Card>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
