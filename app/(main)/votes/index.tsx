import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Modal, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useScheduleStore } from '@/store/schedule';
import { Vote, VoteItem, Profile } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sendPushToUsers } from '@/lib/notifications';
import { PART_LABELS } from '@/types';

export default function VotesScreen() {
  const { profile } = useAuthStore();
  const { setAutoSelectDate } = useScheduleStore();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);
  const [showVoteDetail, setShowVoteDetail] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [allMembers, setAllMembers] = useState<Profile[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showNonVotersModal, setShowNonVotersModal] = useState(false);
  const [selectedNonVoters, setSelectedNonVoters] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [editVoteItems, setEditVoteItems] = useState<string[]>(['', '']);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchVotes = useCallback(async () => {
    const { data } = await supabase
      .from('votes')
      .select(`*, creator:profiles!created_by(name), items:vote_items(id, label, responses:vote_responses(user_id))`)
      .order('created_at', { ascending: false });
    if (data) setVotes(data as unknown as Vote[]);
  }, []);

  const fetchVoteDetail = useCallback(async (voteId: string) => {
    const { data } = await supabase
      .from('votes')
      .select(`*, creator:profiles!created_by(name), items:vote_items(*, responses:vote_responses(*, profile:profiles(id, name, part))), schedule:schedules(id, title, start_at)`)
      .eq('id', voteId)
      .single();
    if (data) setSelectedVote(data as unknown as Vote);
  }, []);

  useEffect(() => {
    fetchVotes();
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) setAllMembers(data as Profile[]);
    });
  }, [fetchVotes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVotes();
    if (selectedVote) await fetchVoteDetail(selectedVote.id);
    setRefreshing(false);
  };

  const openVoteDetail = async (vote: Vote) => {
    setSelectedVote(vote);
    setSelected([]);
    setIsEditing(false);
    setEditForm({ title: '', description: '' });
    setEditVoteItems(['', '']);
    await fetchVoteDetail(vote.id);
    setShowVoteDetail(true);
  };

  const totalVoters = (vote: Vote) => {
    const userIds = new Set(vote.items?.flatMap((i) => i.responses?.map((r) => r.user_id) ?? []));
    return userIds.size;
  };

  const hasVoted = (vote: Vote) => {
    if (!profile) return false;
    return vote.items?.some((i) => i.responses?.some((r) => r.user_id === profile.id)) ?? false;
  };

  // 투표 상세 정보 계산
  const myResponses = selectedVote?.items?.flatMap((i) => i.responses?.filter((r) => r.user_id === profile?.id) ?? []) ?? [];
  const hasVotedDetail = myResponses.length > 0;
  const isExpired = selectedVote?.ends_at ? new Date(selectedVote.ends_at) < new Date() : false;
  const voterIds = new Set(selectedVote?.items?.flatMap((i) => i.responses?.map((r) => r.user_id) ?? []) ?? []);
  const nonVoters = allMembers.filter((m) => !voterIds.has(m.id));
  const canNotifyNonVoters = profile?.is_executive || profile?.id === selectedVote?.created_by;
  const canEditVote = profile?.is_executive || profile?.id === selectedVote?.created_by;
  const totalVotersDetail = voterIds.size;

  const getUserVotes = (userId: string) => {
    return selectedVote?.items
      ?.filter((item) => item.responses?.some((r) => r.user_id === userId))
      ?.map((item) => item.label) ?? [];
  };

  const handleVote = async () => {
    if (!selectedVote || !profile || selected.length === 0) return;
    setSubmitting(true);

    await supabase.from('vote_responses').delete()
      .eq('vote_id', selectedVote.id).eq('user_id', profile.id);

    const rows = selected.map((itemId) => ({
      vote_id: selectedVote.id,
      vote_item_id: itemId,
      user_id: profile.id,
    }));

    const { error } = await supabase.from('vote_responses').insert(rows);
    if (error) Alert.alert('오류', '투표에 실패했습니다.');
    else await fetchVoteDetail(selectedVote.id);

    setSubmitting(false);
    setSelected([]);
  };

  const handleNotifyNonVoters = async () => {
    if (selectedNonVoters.size === 0) {
      Alert.alert('알림', '알림을 보낼 단원을 선택해주세요.');
      return;
    }

    setNotifying(true);
    const selectedMembers = nonVoters.filter((m) => selectedNonVoters.has(m.id));
    const tokens = selectedMembers.map((m) => m.push_token).filter(Boolean) as string[];

    if (tokens.length === 0) {
      Alert.alert('알림', '선택한 단원 중 알림을 받을 수 있는 분이 없습니다.');
      setNotifying(false);
      return;
    }

    await sendPushToUsers(tokens, '투표 참여 요청', `"${selectedVote?.title}" 투표에 아직 참여하지 않으셨습니다. 참여해주세요!`);
    Alert.alert('완료', `${tokens.length}명에게 알림을 보냈습니다.`);
    setNotifying(false);
    setSelectedNonVoters(new Set());
    setShowNonVotersModal(false);
  };

  const toggleSelect = (itemId: string) => {
    if (selectedVote?.multiple_choice) {
      setSelected((prev) => prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]);
    } else {
      setSelected([itemId]);
    }
  };

  const openEditModal = () => {
    if (!selectedVote) return;
    setEditForm({ title: selectedVote.title, description: selectedVote.description || '' });
    setEditVoteItems(selectedVote.items?.map((item) => item.label) || ['', '']);
    setIsEditing(true);
  };

  const handleEditVote = async () => {
    if (!editForm.title.trim() || editVoteItems.filter(Boolean).length < 2) {
      Alert.alert('입력 오류', '투표 제목과 최소 2개의 항목을 입력해주세요.');
      return;
    }
    if (!selectedVote) return;
    setSavingEdit(true);

    const { error: updateError } = await supabase.from('votes').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
    }).eq('id', selectedVote.id);

    if (updateError) {
      Alert.alert('오류', '투표 수정에 실패했습니다.');
      setSavingEdit(false);
      return;
    }

    const existingItems = selectedVote.items || [];
    const newItems = editVoteItems.filter(Boolean);

    for (const existingItem of existingItems) {
      if (!newItems.includes(existingItem.label)) {
        const hasResponses = (existingItem.responses?.length ?? 0) > 0;
        if (!hasResponses) {
          await supabase.from('vote_items').delete().eq('id', existingItem.id);
        }
      }
    }

    const existingLabels = existingItems.map((item) => item.label);
    for (let i = 0; i < newItems.length; i++) {
      if (!existingLabels.includes(newItems[i])) {
        await supabase.from('vote_items').insert({
          vote_id: selectedVote.id,
          label: newItems[i],
          order_index: i,
        });
      }
    }

    for (let i = 0; i < existingItems.length; i++) {
      if (newItems.includes(existingItems[i].label)) {
        await supabase.from('vote_items').update({ order_index: newItems.indexOf(existingItems[i].label) })
          .eq('id', existingItems[i].id);
      }
    }

    setIsEditing(false);
    await fetchVoteDetail(selectedVote.id);
    Alert.alert('완료', '투표가 수정되었습니다.');
    setSavingEdit(false);
  };

  const handleDeleteVote = () => {
    Alert.alert('투표 삭제', '이 투표를 정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error: responseError } = await supabase.from('vote_responses').delete().eq('vote_id', selectedVote!.id);
            if (responseError) throw responseError;

            const { error: itemError } = await supabase.from('vote_items').delete().eq('vote_id', selectedVote!.id);
            if (itemError) throw itemError;

            const { error: voteDeleteError } = await supabase.from('votes').delete().eq('id', selectedVote!.id);
            if (voteDeleteError) throw voteDeleteError;

            // 모달 먼저 닫기
            setShowVoteDetail(false);
            setSelectedVote(null);

            // 목록 새로고침
            await fetchVotes();

            // 완료 알림
            Alert.alert('완료', '투표가 삭제되었습니다.');
          } catch (error: any) {
            console.error('Delete vote error:', error);
            Alert.alert('오류', `투표 삭제에 실패했습니다.\n${error.message}`);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">투표</Text>
        {profile?.is_executive && (
          <TouchableOpacity
            onPress={() => router.push('/(main)/votes/create')}
            className="bg-indigo-600 rounded-xl px-4 py-2"
          >
            <Text className="text-white font-medium text-sm">+ 새 투표</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={votes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-gray-400 text-base">진행 중인 투표가 없습니다</Text>
          </View>
        }
        renderItem={({ item }) => {
          const voted = hasVoted(item);
          const voters = totalVoters(item);
          const isExpired = item.ends_at ? new Date(item.ends_at) < new Date() : false;

          return (
            <TouchableOpacity onPress={() => openVoteDetail(item)} className="mb-3">
              <Card>
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900 mb-1">{item.title}</Text>
                    <Text className="text-xs text-gray-400">
                      {(item.creator as { name?: string } | undefined)?.name} · {format(new Date(item.created_at), 'M월 d일', { locale: ko })}
                    </Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${isExpired ? 'bg-gray-100' : voted ? 'bg-green-100' : 'bg-amber-100'}`}>
                    <Text className={`text-xs font-medium ${isExpired ? 'text-gray-500' : voted ? 'text-green-700' : 'text-amber-700'}`}>
                      {isExpired ? '종료' : voted ? '참여완료' : '미참여'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-xs text-gray-500">참여 {voters}명</Text>
                  {item.ends_at && (
                    <Text className="text-xs text-gray-400">
                      ~{format(new Date(item.ends_at), 'M월 d일 HH:mm', { locale: ko })}
                    </Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* 투표 상세 모달 */}
      <Modal visible={showVoteDetail} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setShowVoteDetail(false); setIsEditing(false); }}>
              <Text className="text-gray-500">닫기</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">{isEditing ? '투표 수정' : '투표 상세'}</Text>
            <View className="flex-row gap-2">
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
            {selectedVote && !isEditing ? (
              <>
                <Card className="mb-4">
                  <Text className="text-xl font-bold text-gray-900 mb-2">{selectedVote.title}</Text>
                  {selectedVote.description && <Text className="text-gray-500 text-sm mb-3">{selectedVote.description}</Text>}
                  <View className="flex-row flex-wrap gap-2">
                    {selectedVote.multiple_choice && <Text className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">복수선택</Text>}
                    {isExpired && <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">종료됨</Text>}
                    {selectedVote.ends_at && (
                      <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                        ~{format(new Date(selectedVote.ends_at), 'M월 d일 HH:mm', { locale: ko })}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center justify-between mt-3">
                    <Text className="text-sm text-gray-500">총 {totalVotersDetail}명 참여</Text>
                    <TouchableOpacity onPress={() => setShowParticipants(true)} className="bg-indigo-50 px-3 py-1 rounded-lg">
                      <Text className="text-xs text-indigo-600 font-medium">참여자 현황</Text>
                    </TouchableOpacity>
                  </View>
                </Card>

                {selectedVote?.schedule && (
                  <Button
                    label={`📅 ${selectedVote.schedule.title} 일정으로 이동`}
                    onPress={() => {
                      setAutoSelectDate(selectedVote.schedule?.start_at?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'));
                      setShowVoteDetail(false);
                      router.push('/(main)/schedule');
                    }}
                    variant="outline"
                    className="mb-4"
                  />
                )}

                <Text className="text-base font-semibold text-gray-800 mb-3">투표 항목</Text>
                {selectedVote.items?.map((item, idx) => {
                  const isSelected = selected.includes(item.id);
                  const responseCount = item.responses?.length ?? 0;
                  const hasResponses = responseCount > 0;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => !isExpired && !hasResponses && toggleSelect(item.id)}
                      disabled={isExpired || hasResponses}
                      className={`mb-2 p-3 rounded-lg border-2 ${isSelected ? 'bg-indigo-50 border-indigo-500' : 'border-gray-200 bg-white'} ${(isExpired || hasResponses) ? 'opacity-70' : ''}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-sm font-medium flex-1 ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>{item.label}</Text>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-xs text-gray-500">{responseCount}명</Text>
                          {selectedVote.multiple_choice ? (
                            <View className={`w-5 h-5 border-2 rounded ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`} />
                          ) : (
                            <View className={`w-5 h-5 border-2 rounded-full ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`} />
                          )}
                        </View>
                      </View>
                      {hasResponses && <Text className="text-xs text-red-500 mt-1">⚠️ {responseCount}명이 투표했으므로 수정/삭제 불가</Text>}
                    </TouchableOpacity>
                  );
                })}

                {!isExpired && (
                  <View className="flex-row gap-2 mt-5">
                    <Button
                      label={hasVotedDetail ? '재투표' : '투표하기'}
                      onPress={handleVote}
                      loading={submitting}
                      className="flex-1"
                    />
                    {canNotifyNonVoters && nonVoters.length > 0 && (
                      <Button
                        label={`미참여(${nonVoters.length})`}
                        variant="outline"
                        onPress={() => {
                          setSelectedNonVoters(new Set());
                          setShowNonVotersModal(true);
                        }}
                        className="flex-1"
                      />
                    )}
                  </View>
                )}
              </>
            ) : selectedVote && isEditing ? (
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
                  const hasResponses = selectedVote?.items?.[idx]?.responses && (selectedVote.items[idx].responses?.length ?? 0) > 0;
                  const responseCount = selectedVote?.items?.[idx]?.responses?.length ?? 0;
                  return (
                    <View key={idx}>
                      {hasResponses && (
                        <Text className="text-xs text-red-500 mb-1 ml-1">
                          ⚠️ {responseCount}명이 투표했으므로 수정/삭제 불가
                        </Text>
                      )}
                      <View className="flex-row items-center gap-2 mb-2">
                        <Text className="text-sm text-gray-600 font-medium">{idx + 1}.</Text>
                        <View className="flex-1">
                          <Input
                            value={item}
                            onChangeText={(v) => setEditVoteItems((prev) => prev.map((it, i) => i === idx ? v : it))}
                            placeholder={`항목 ${idx + 1}`}
                            editable={!hasResponses}
                          />
                        </View>
                        {editVoteItems.length > 2 && !hasResponses && (
                          <TouchableOpacity onPress={() => setEditVoteItems((prev) => prev.filter((_, i) => i !== idx))}>
                            <Text className="text-red-400 text-lg">✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
                {editVoteItems.filter(Boolean).length < 5 && (
                  <TouchableOpacity
                    onPress={() => setEditVoteItems((prev) => [...prev, ''])}
                    className="border border-dashed border-indigo-300 rounded-lg py-2 items-center mb-4"
                  >
                    <Text className="text-indigo-600 text-sm">+ 항목 추가</Text>
                  </TouchableOpacity>
                )}
                <Button
                  label="저장"
                  onPress={handleEditVote}
                  loading={savingEdit}
                />
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 참여자 현황 모달 */}
      <Modal visible={showParticipants} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowParticipants(false)}>
              <Text className="text-gray-500">닫기</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">참여자 현황</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={allMembers}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item: member }) => {
              const votes = getUserVotes(member.id);
              return (
                <Card className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{member.name}</Text>
                      {votes.length > 0 && (
                        <Text className="text-xs text-gray-500 mt-1">
                          {votes.join(', ')}
                        </Text>
                      )}
                    </View>
                    <View className={`px-2.5 py-1 rounded-full ${votes.length > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Text className={`text-xs font-medium ${votes.length > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                        {votes.length > 0 ? '참여' : '미참여'}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* 미참여자 선택 모달 */}
      <Modal visible={showNonVotersModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setShowNonVotersModal(false); setSelectedNonVoters(new Set()); }}>
              <Text className="text-gray-500">닫기</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">미참여자 알림</Text>
            <TouchableOpacity onPress={() => {
              if (selectedNonVoters.size === nonVoters.length) {
                setSelectedNonVoters(new Set());
              } else {
                setSelectedNonVoters(new Set(nonVoters.map((m) => m.id)));
              }
            }}>
              <Text className="text-indigo-600 font-medium text-sm">
                {selectedNonVoters.size === nonVoters.length ? '전체해제' : '전체선택'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={nonVoters}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-gray-400">미참여 단원이 없습니다</Text>
              </View>
            }
            renderItem={({ item: member }) => {
              const isSelected = selectedNonVoters.has(member.id);
              return (
                <TouchableOpacity
                  onPress={() => {
                    const newSet = new Set(selectedNonVoters);
                    if (isSelected) {
                      newSet.delete(member.id);
                    } else {
                      newSet.add(member.id);
                    }
                    setSelectedNonVoters(newSet);
                  }}
                  className={`flex-row items-center gap-3 p-3 rounded-lg mb-2 border-2 ${
                    isSelected ? 'bg-indigo-50 border-indigo-500' : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className={`w-5 h-5 border-2 rounded ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                    {isSelected && <Text className="text-white text-xs text-center">✓</Text>}
                  </View>
                  <Text className={`text-sm font-medium flex-1 ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <View className="px-5 py-4 border-t border-gray-200 bg-white">
            <Button
              label={`${selectedNonVoters.size}명에게 알림 보내기`}
              onPress={handleNotifyNonVoters}
              loading={notifying}
              disabled={selectedNonVoters.size === 0}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
