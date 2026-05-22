import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Alert, Modal, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parse, setDate } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useScheduleStore } from '@/store/schedule';
import { Schedule, Song, Vote } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { sendPushToUsers } from '@/lib/notifications';

export default function ScheduleScreen() {
  const { profile } = useAuthStore();
  const { autoSelectDate, setAutoSelectDate } = useScheduleStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [displayedMonth, setDisplayedMonth] = useState('');
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [showCreate, setShowCreate] = useState(false);
  const [allDay, setAllDay] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', start_at: '', end_at: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [songList, setSongList] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [tempSelectedSongs, setTempSelectedSongs] = useState<Song[]>([]);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', start_at: '', end_at: '', location: '' });
  const [selectedSongDetail, setSelectedSongDetail] = useState<Song | null>(null);
  const [showSongDetail, setShowSongDetail] = useState(false);
  const [showCreateVote, setShowCreateVote] = useState(false);
  const [voteForm, setVoteForm] = useState({ title: '', description: '' });
  const [voteItems, setVoteItems] = useState<string[]>(['', '']);
  const [voteEndsAt, setVoteEndsAt] = useState('');
  const [voteMultipleChoice, setVoteMultipleChoice] = useState(false);
  const [voteAnonymous, setVoteAnonymous] = useState(true);
  const [savingVote, setSavingVote] = useState(false);
  const [linkedVote, setLinkedVote] = useState<{ id: string; title: string } | null>(null);
  const [selectedVoteDetail, setSelectedVoteDetail] = useState<Vote | null>(null);
  const [showVoteDetailModal, setShowVoteDetailModal] = useState(false);
  const [voteSelected, setVoteSelected] = useState<string[]>([]);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [voteIsEditing, setVoteIsEditing] = useState(false);
  const [voteEditForm, setVoteEditForm] = useState({ title: '', description: '' });
  const [voteEditItems, setVoteEditItems] = useState<string[]>(['', '']);
  const [voteSavingEdit, setVoteSavingEdit] = useState(false);
  const [voteNotifying, setVoteNotifying] = useState(false);
  const [voteShowParticipants, setVoteShowParticipants] = useState(false);
  const [voteShowNonVotersModal, setVoteShowNonVotersModal] = useState(false);
  const [voteSelectedNonVoters, setVoteSelectedNonVoters] = useState<Set<string>>(new Set());
  const [allMembers, setAllMembers] = useState<any[]>([]);

  const fetchSchedules = useCallback(async () => {
    const { data } = await supabase
      .from('schedules')
      .select('*, creator:profiles!created_by(name), song:songs(*, files:song_files(*)), songs:schedule_songs(order, songs(*, files:song_files(*)))')
      .order('start_at');
    if (data) {
      // Transform schedule_songs relationship
      const transformed = (data as any[]).map((s) => ({
        ...s,
        songs: (s.songs || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((ss: any) => ss.songs),
      }));
      setSchedules(transformed as unknown as Schedule[]);
    }
  }, []);

  const fetchVoteDetail = useCallback(async (voteId: string) => {
    const { data } = await supabase
      .from('votes')
      .select(`*, creator:profiles!created_by(name), items:vote_items(*, responses:vote_responses(*, profile:profiles(id, name, part)))`)
      .eq('id', voteId)
      .single();
    if (data) setSelectedVoteDetail(data as unknown as Vote);
  }, []);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const dateToSelect = autoSelectDate || today;
    setSelectedDate(dateToSelect);
    setDisplayedMonth(dateToSelect);
    if (autoSelectDate) {
      setAutoSelectDate(null);
    }
    fetchSchedules();
    supabase.from('songs').select('id, title').order('title').then(({ data }) => {
      if (data) setSongList(data as Song[]);
    });
    supabase.from('profiles').select('*').then(({ data }) => {
      if (data) setAllMembers(data);
    });
  }, [fetchSchedules]);


  // 달력 마킹 데이터 생성
  const markedDates = schedules.reduce<Record<string, { dots: { color: string }[]; selected?: boolean; selectedColor?: string }>>((acc, s) => {
    if (!s.start_at) return acc;
    try {
      const dateKey = s.start_at.slice(0, 10);
      if (!acc[dateKey]) acc[dateKey] = { dots: [] };
      acc[dateKey].dots = [...(acc[dateKey].dots ?? []), { color: '#4f46e5' }];
    } catch (e) {
      console.warn('Error processing schedule date:', s.start_at);
    }
    return acc;
  }, {});

  // 선택된 날짜 표시
  if (selectedDate && markedDates[selectedDate]) {
    markedDates[selectedDate] = { ...markedDates[selectedDate], selected: true, selectedColor: '#4f46e5' };
  } else if (selectedDate) {
    markedDates[selectedDate] = { dots: [], selected: true, selectedColor: '#4f46e5' };
  }

  // 선택된 날짜의 일정
  const daySchedules = selectedDate ? schedules.filter((s) => s.start_at && s.start_at.slice(0, 10) === selectedDate) : [];

  const handleCreate = async () => {
    if (!form.title.trim() || !form.start_at) {
      Alert.alert('입력 오류', '제목과 날짜를 선택해주세요.'); return;
    }
    setSaving(true);

    // 하루종일: 날짜만 저장 (시간 00:00)
    const startAt = allDay
      ? new Date(`${form.start_at}T00:00:00`).toISOString()
      : form.start_at;
    const endAt = allDay
      ? (form.end_at ? new Date(`${form.end_at}T00:00:00`).toISOString() : null)
      : (form.end_at || null);

    const { data: scheduleData, error } = await supabase.from('schedules').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_at: startAt,
      end_at: endAt,
      location: form.location.trim() || null,
      song_id: selectedSongs[0]?.id || null,
      created_by: profile?.id,
    }).select().single();

    if (error) {
      console.error('Schedule creation error:', error);
      Alert.alert('오류', `일정 추가에 실패했습니다.\n${error.message}`);
      setSaving(false);
      return;
    }

    // 여러 특송 추가
    if (selectedSongs.length > 0 && scheduleData) {
      const scheduleSongs = selectedSongs.map((song, idx) => ({
        schedule_id: scheduleData.id,
        song_id: song.id,
        order: idx,
      }));
      await supabase.from('schedule_songs').insert(scheduleSongs);
    }

    setShowCreate(false);
    setSelectedSongs([]);
    setForm({ title: '', description: '', start_at: selectedDate ? `${selectedDate}T09:00:00.000Z` : '', end_at: '', location: '' });
    await fetchSchedules();
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('삭제 확인', '이 일정을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('schedules').delete().eq('id', id);
        if (error) {
          Alert.alert('오류', '일정 삭제에 실패했습니다. ' + error.message);
          return;
        }
        // 모달 먼저 닫기
        setShowScheduleDetail(false);
        // 목록 새로고침
        await fetchSchedules();
      }},
    ]);
  };

  const handleEditSchedule = async () => {
    if (!editForm.title.trim() || !editForm.start_at) {
      Alert.alert('입력 오류', '제목과 날짜를 선택해주세요.');
      return;
    }
    setSaving(true);

    const startAt = allDay
      ? new Date(`${editForm.start_at}T00:00:00`).toISOString()
      : editForm.start_at;
    const endAt = allDay
      ? (editForm.end_at ? new Date(`${editForm.end_at}T00:00:00`).toISOString() : null)
      : (editForm.end_at || null);

    const { error } = await supabase.from('schedules').update({
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      start_at: startAt,
      end_at: endAt,
      location: editForm.location.trim() || null,
      song_id: selectedSongs[0]?.id || null,
    }).eq('id', selectedSchedule!.id);

    if (error) {
      Alert.alert('오류', '일정 수정에 실패했습니다.');
      setSaving(false);
      return;
    }

    // 기존 schedule_songs 삭제
    await supabase.from('schedule_songs').delete().eq('schedule_id', selectedSchedule!.id);

    // 새로운 schedule_songs 추가
    if (selectedSongs.length > 0) {
      const scheduleSongs = selectedSongs.map((song, idx) => ({
        schedule_id: selectedSchedule!.id,
        song_id: song.id,
        order: idx,
      }));
      await supabase.from('schedule_songs').insert(scheduleSongs);
    }

    setEditingSchedule(false);
    setShowScheduleDetail(false);
    setSelectedSchedule(null);
    await fetchSchedules();
    setSaving(false);
  };

  const openScheduleDetail = async (schedule: Schedule) => {
    try {
      setSelectedSchedule(schedule);
      const startTime = new Date(schedule.start_at);
      const isAllDay = format(startTime, 'HH:mm') === '00:00';
      setAllDay(isAllDay);
      setEditForm({
        title: schedule.title,
        description: schedule.description || '',
        start_at: schedule.start_at.slice(0, 10),
        end_at: schedule.end_at?.slice(0, 10) || '',
        location: schedule.location || '',
      });
      // 여러 특송 로드 (schedule_songs에서 로드된 songs 배열 사용)
      const songs = schedule.songs && schedule.songs.length > 0 ? schedule.songs : (schedule.song ? [schedule.song] : []);
      setSelectedSongs(songs);

      // 해당 일정과 연동된 투표 찾기
      const { data: voteData } = await supabase
        .from('votes')
        .select('id, title')
        .eq('schedule_id', schedule.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (voteData) {
        setLinkedVote({ id: voteData.id, title: voteData.title });
      } else {
        setLinkedVote(null);
      }

      setShowScheduleDetail(true);
    } catch (e) {
      console.error('Error opening schedule detail:', e);
      Alert.alert('오류', '일정을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const openCreate = () => {
    setAllDay(true);
    setSelectedSongs([]);
    setSongSearch('');
    setForm((f) => ({ ...f, start_at: selectedDate, end_at: '', title: '', description: '', location: '' }));
    setShowCreate(true);
  };

  const handleCreateVote = async () => {
    if (!voteForm.title.trim() || voteItems.filter(Boolean).length < 2) {
      Alert.alert('입력 오류', '투표 제목과 최소 2개의 항목을 입력해주세요.');
      return;
    }
    if (!voteEndsAt) {
      Alert.alert('입력 오류', '투표 종료일시를 선택해주세요.');
      return;
    }

    setSavingVote(true);
    const voteId = Crypto.randomUUID();

    // 투표 생성
    const { error: voteError } = await supabase.from('votes').insert({
      id: voteId,
      title: voteForm.title.trim(),
      description: voteForm.description.trim() || null,
      is_anonymous: voteAnonymous,
      multiple_choice: voteMultipleChoice,
      ends_at: voteEndsAt,
      created_by: profile?.id,
      schedule_id: selectedSchedule?.id || null,
    });

    if (voteError) {
      console.error('Vote creation error:', voteError);
      Alert.alert('오류', `투표 생성에 실패했습니다.\n${voteError.message}`);
      setSavingVote(false);
      return;
    }

    // 투표 항목 생성
    const validItems = voteItems.filter(Boolean);
    const itemsToInsert = validItems.map((label, idx) => ({
      id: Crypto.randomUUID(),
      vote_id: voteId,
      label: label.trim(),
      order_index: idx,
    }));

    const { error: itemsError } = await supabase.from('vote_items').insert(itemsToInsert);
    if (itemsError) {
      console.error('Vote items creation error:', itemsError);
      Alert.alert('오류', `투표 항목 생성에 실패했습니다.\n${itemsError.message}`);
      setSavingVote(false);
      return;
    }

    // 전체 단원에게 푸시 알림
    const { data: members } = await supabase.from('profiles').select('push_token').not('push_token', 'is', null);
    const tokens = (members ?? []).map((m: { push_token: string | null }) => m.push_token).filter(Boolean) as string[];
    if (tokens.length > 0) {
      await sendPushToUsers(tokens, '새 투표가 등록되었습니다', `"${voteForm.title.trim()}" 투표에 참여해주세요!`);
    }

    Alert.alert('완료', '투표가 생성되었습니다.');
    setShowCreateVote(false);
    setShowScheduleDetail(false);
    setVoteForm({ title: '', description: '' });
    setVoteItems(['', '']);
    setVoteEndsAt('');
    setVoteMultipleChoice(false);
    setVoteAnonymous(true);
    setSavingVote(false);

    // 투표 상세 화면으로 이동
    router.push(`/(main)/votes/${voteId}`);
  };

  // 투표 모달 관련 함수들
  const voteMyResponses = selectedVoteDetail?.items?.flatMap((i) => i.responses?.filter((r) => r.user_id === profile?.id) ?? []) ?? [];
  const voteHasVoted = voteMyResponses.length > 0;
  const voteIsExpired = selectedVoteDetail?.ends_at ? new Date(selectedVoteDetail.ends_at) < new Date() : false;
  const voteVoterIds = new Set(selectedVoteDetail?.items?.flatMap((i) => i.responses?.map((r) => r.user_id) ?? []) ?? []);
  const voteNonVoters = allMembers.filter((m) => !voteVoterIds.has(m.id));
  const voteCanEditVote = profile?.is_executive || profile?.id === selectedVoteDetail?.created_by;
  const voteTotalVoters = voteVoterIds.size;

  const getVoteUserVotes = (userId: string) => {
    return selectedVoteDetail?.items
      ?.filter((item) => item.responses?.some((r) => r.user_id === userId))
      ?.map((item) => item.label) ?? [];
  };

  const handleVoteSubmit = async () => {
    if (!selectedVoteDetail || !profile || voteSelected.length === 0) return;
    setVoteSubmitting(true);

    await supabase.from('vote_responses').delete()
      .eq('vote_id', selectedVoteDetail.id).eq('user_id', profile.id);

    const rows = voteSelected.map((itemId) => ({
      vote_id: selectedVoteDetail.id,
      vote_item_id: itemId,
      user_id: profile.id,
    }));

    const { error } = await supabase.from('vote_responses').insert(rows);
    if (error) Alert.alert('오류', '투표에 실패했습니다.');
    else await fetchVoteDetail(selectedVoteDetail.id);

    setVoteSubmitting(false);
    setVoteSelected([]);
  };

  const handleVoteEditOpen = () => {
    if (!selectedVoteDetail) return;
    setVoteEditForm({ title: selectedVoteDetail.title, description: selectedVoteDetail.description || '' });
    setVoteEditItems(selectedVoteDetail.items?.map((item) => item.label) || ['', '']);
    setVoteIsEditing(true);
  };

  const handleVoteEditSave = async () => {
    if (!voteEditForm.title.trim() || voteEditItems.filter(Boolean).length < 2) {
      Alert.alert('입력 오류', '투표 제목과 최소 2개의 항목을 입력해주세요.');
      return;
    }
    if (!selectedVoteDetail) return;
    setVoteSavingEdit(true);

    const { error: updateError } = await supabase.from('votes').update({
      title: voteEditForm.title.trim(),
      description: voteEditForm.description.trim() || null,
    }).eq('id', selectedVoteDetail.id);

    if (updateError) {
      Alert.alert('오류', '투표 수정에 실패했습니다.');
      setVoteSavingEdit(false);
      return;
    }

    const existingItems = selectedVoteDetail.items || [];
    const newItems = voteEditItems.filter(Boolean);

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
          vote_id: selectedVoteDetail.id,
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

    setVoteIsEditing(false);
    await fetchVoteDetail(selectedVoteDetail.id);
    Alert.alert('완료', '투표가 수정되었습니다.');
    setVoteSavingEdit(false);
  };

  const handleVoteDelete = () => {
    Alert.alert('투표 삭제', '이 투표를 정말 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error: responseError } = await supabase.from('vote_responses').delete().eq('vote_id', selectedVoteDetail!.id);
            if (responseError) throw responseError;

            const { error: itemError } = await supabase.from('vote_items').delete().eq('vote_id', selectedVoteDetail!.id);
            if (itemError) throw itemError;

            const { error: voteDeleteError } = await supabase.from('votes').delete().eq('id', selectedVoteDetail!.id);
            if (voteDeleteError) throw voteDeleteError;

            setShowVoteDetailModal(false);
            setSelectedVoteDetail(null);
            Alert.alert('완료', '투표가 삭제되었습니다.');
          } catch (error: any) {
            console.error('Delete vote error:', error);
            Alert.alert('오류', `투표 삭제에 실패했습니다.\n${error.message}`);
          }
        },
      },
    ]);
  };

  const handleVoteNotifyNonVoters = async () => {
    if (voteSelectedNonVoters.size === 0) {
      Alert.alert('알림', '알림을 보낼 단원을 선택해주세요.');
      return;
    }

    setVoteNotifying(true);
    const selectedMembers = voteNonVoters.filter((m) => voteSelectedNonVoters.has(m.id));
    const tokens = selectedMembers.map((m) => m.push_token).filter(Boolean) as string[];

    if (tokens.length === 0) {
      Alert.alert('알림', '선택한 단원 중 알림을 받을 수 있는 분이 없습니다.');
      setVoteNotifying(false);
      return;
    }

    await sendPushToUsers(tokens, '투표 참여 요청', `"${selectedVoteDetail?.title}" 투표에 아직 참여하지 않으셨습니다. 참여해주세요!`);
    Alert.alert('완료', `${tokens.length}명에게 알림을 보냈습니다.`);
    setVoteNotifying(false);
    setVoteSelectedNonVoters(new Set());
    setVoteShowNonVotersModal(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">일정</Text>
        {profile?.is_executive && (
          <TouchableOpacity onPress={openCreate} className="bg-indigo-600 rounded-xl px-4 py-2">
            <Text className="text-white font-medium text-sm">+ 추가</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView>
        {/* 달력 */}
        {selectedDate && (
          <View className="bg-white">
            <Calendar
              key={displayedMonth}
              current={displayedMonth}
              onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
              onMonthChange={(month: any) => {
                if (month.dateString && selectedDate) {
                  // selectedDate의 일자 추출
                  const selectedDateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
                  const day = selectedDateObj.getDate();

                  // 새로운 달의 마지막 일자 확인
                  const displayedDateObj = parse(month.dateString, 'yyyy-MM-dd', new Date());
                  const lastDay = new Date(displayedDateObj.getFullYear(), displayedDateObj.getMonth() + 1, 0).getDate();
                  const safeDay = Math.min(day, lastDay);

                  // 새로운 달의 유효한 일자로 설정
                  const newDateObj = new Date(displayedDateObj.getFullYear(), displayedDateObj.getMonth(), safeDay);
                  const newDateString = format(newDateObj, 'yyyy-MM-dd');

                  setDisplayedMonth(month.dateString);
                  setSelectedDate(newDateString);
                }
              }}
              markedDates={markedDates}
              markingType="multi-dot"
              renderHeader={() => {
                const [year, month] = displayedMonth.split('-');
                const dateObj = new Date(displayedMonth);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setPickerYear(parseInt(year));
                      setPickerMonth(parseInt(month));
                      setShowYearMonthPicker(true);
                    }}
                    className="flex-row items-center justify-center py-3"
                  >
                    <Text className="text-lg font-semibold text-gray-900">
                      {format(dateObj, 'MMMM yyyy', { locale: ko })}
                    </Text>
                    <Text className="text-gray-400 ml-2">▼</Text>
                  </TouchableOpacity>
                );
              }}
              theme={{
                todayTextColor: '#4f46e5',
                selectedDayBackgroundColor: '#4f46e5',
                arrowColor: '#4f46e5',
                dotColor: '#4f46e5',
                selectedDotColor: '#ffffff',
                monthTextColor: '#111827',
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
                calendarBackground: '#ffffff',
              }}
              style={{ marginBottom: 4 }}
            />
          </View>
        )}

        {/* 선택된 날짜 일정 목록 */}
        {selectedDate && (
          <View className="px-5 py-4">
            <Text className="text-base font-bold text-gray-800 mb-3">
              {format(new Date(selectedDate), 'M월 d일 (EEE)', { locale: ko })} 일정
            </Text>

          {daySchedules.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-gray-400 text-sm">이 날 등록된 일정이 없습니다</Text>
              {profile?.is_executive && (
                <TouchableOpacity onPress={openCreate} className="mt-3">
                  <Text className="text-indigo-500 text-sm">+ 일정 추가하기</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            daySchedules.map((s) => {
              if (!s.start_at) return null;
              return (
              <TouchableOpacity key={s.id} onPress={() => openScheduleDetail(s)}>
                <Card className="mb-3 flex-row gap-3">
                  <View className="w-1 bg-indigo-400 rounded-full" />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{s.title}</Text>
                    {format(new Date(s.start_at), 'HH:mm') === '00:00' ? (
                      <Text className="text-xs text-indigo-400 mt-0.5">
                        {s.end_at && s.end_at.slice(0, 10) !== s.start_at.slice(0, 10)
                          ? `${format(new Date(s.start_at), 'M월 d일')} ~ ${format(new Date(s.end_at), 'M월 d일')}`
                          : '하루종일'}
                      </Text>
                    ) : (
                      <Text className="text-xs text-indigo-500 mt-0.5">
                        {format(new Date(s.start_at), 'HH:mm')}
                        {s.end_at ? ` ~ ${format(new Date(s.end_at), 'HH:mm')}` : ''}
                      </Text>
                    )}
                    {s.location && <Text className="text-xs text-gray-400 mt-0.5">📍 {s.location}</Text>}
                    {s.songs && s.songs.length > 0 ? (
                      <Text className="text-xs text-purple-500 mt-0.5">
                        🎵 {s.songs.map((song) => song.title).join(', ')}
                      </Text>
                    ) : s.song ? (
                      <Text className="text-xs text-purple-500 mt-0.5">🎵 {s.song.title}</Text>
                    ) : null}
                    {s.description && <Text className="text-xs text-gray-500 mt-1">{s.description}</Text>}
                  </View>
                  {profile?.is_executive && (
                    <TouchableOpacity onPress={(e) => {
                      e.stopPropagation?.();
                      handleDelete(s.id);
                    }} className="justify-center px-1">
                      <Text className="text-red-400 text-lg">✕</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              </TouchableOpacity>
            );
            })
          )}
          </View>
        )}
      </ScrollView>

      {/* 일정 추가 모달 */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text className="text-gray-500">취소</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">새 일정</Text>
            <Button label="저장" size="sm" onPress={handleCreate} loading={saving} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Input
              label="제목"
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder="일정 제목"
            />

            {/* 하루종일 토글 */}
            <View className="flex-row items-center justify-between py-3 mb-2 border border-gray-200 rounded-xl px-4 bg-white">
              <View>
                <Text className="text-sm font-medium text-gray-700">하루종일</Text>
                <Text className="text-xs text-gray-400">시간 없이 날짜만 설정</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAllDay((v) => !v);
                  setForm((f) => ({ ...f, start_at: selectedDate, end_at: '' }));
                }}
                className={`w-12 h-7 rounded-full justify-center px-1 ${allDay ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 bg-white rounded-full shadow ${allDay ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>

            {allDay ? (
              <>
                <DatePickerField
                  label="시작 날짜"
                  value={form.start_at}
                  onChange={(v) => setForm((f) => ({ ...f, start_at: v }))}
                  mode="date"
                />
                <DatePickerField
                  label="종료 날짜 (선택, 여러 날일 경우)"
                  value={form.end_at}
                  onChange={(v) => setForm((f) => ({ ...f, end_at: v }))}
                  mode="date"
                  placeholder="하루짜리면 비워두세요"
                />
              </>
            ) : (
              <>
                <DateTimePickerField
                  label="시작일시"
                  value={form.start_at}
                  onChange={(v) => setForm((f) => ({ ...f, start_at: v }))}
                />
                <DateTimePickerField
                  label="종료일시 (선택)"
                  value={form.end_at}
                  onChange={(v) => setForm((f) => ({ ...f, end_at: v }))}
                  placeholder="종료 시간 선택"
                />
              </>
            )}

            <Input
              label="장소 (선택)"
              value={form.location}
              onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
              placeholder="장소"
            />

            {/* 특송 연결 */}
            <Text className="text-sm font-medium text-gray-700 mb-2">특송 연결 (선택)</Text>
            {selectedSongs.length > 0 && (
              <View className="mb-3 gap-2">
                {selectedSongs.map((song, idx) => (
                  <View key={song.id} className="flex-row items-center justify-between bg-indigo-50 rounded-xl px-3 py-2">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Text className="text-xs text-gray-400">{idx + 1}.</Text>
                      <Text className="text-sm text-indigo-900 font-medium flex-1">{song.title}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedSongs((prev) => prev.filter((s) => s.id !== song.id))}>
                      <Text className="text-indigo-400 text-lg">✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              onPress={() => { setSongSearch(''); setTempSelectedSongs(selectedSongs); setShowSongPicker(true); }}
              className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between bg-white mb-4"
            >
              <Text className="text-gray-400 text-base">+ 특송 추가...</Text>
              <Text className="text-gray-400">▼</Text>
            </TouchableOpacity>

            <Input
              label="설명 (선택)"
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="일정 설명"
              multiline
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* 특송 선택 모달 */}
      <Modal visible={showSongPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setSelectedSongs(tempSelectedSongs); setShowSongPicker(false); }}>
              <Text className="text-gray-500 font-medium">취소</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">특송 선택</Text>
            <TouchableOpacity onPress={() => setShowSongPicker(false)}>
              <Text className="text-indigo-600 font-bold">확인</Text>
            </TouchableOpacity>
          </View>
          <View className="px-5 py-3">
            <Input
              value={songSearch}
              onChangeText={setSongSearch}
              placeholder="곡 제목 검색..."
            />
          </View>
          <FlatList
            data={songList.filter((s) => s.title.toLowerCase().includes(songSearch.toLowerCase()))}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-gray-400">등록된 특송이 없습니다</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = selectedSongs.some((s) => s.id === item.id);
              return (
                <TouchableOpacity
                  onPress={() => {
                    if (isSelected) {
                      setSelectedSongs((prev) => prev.filter((s) => s.id !== item.id));
                    } else {
                      setSelectedSongs((prev) => [...prev, item]);
                    }
                  }}
                  className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between"
                >
                  <Text className="text-gray-900 text-base flex-1">{item.title}</Text>
                  {isSelected && <Text className="text-indigo-600 font-bold">✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* 일정 상세보기 모달 */}
      <Modal visible={showScheduleDetail} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setShowScheduleDetail(false); setEditingSchedule(false); }}>
              <Text className="text-gray-500">닫기</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">{editingSchedule ? '일정 수정' : '일정 상세'}</Text>
            <View className="flex-row gap-2">
              {!editingSchedule && (profile?.is_executive || profile?.id === selectedSchedule?.created_by) && (
                <TouchableOpacity onPress={() => setEditingSchedule(true)}>
                  <Text className="text-indigo-600 font-medium">수정</Text>
                </TouchableOpacity>
              )}
              {editingSchedule && (
                <TouchableOpacity onPress={() => setEditingSchedule(false)}>
                  <Text className="text-gray-500">취소</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!editingSchedule ? (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
              <Card className="mb-4">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-gray-900 mb-2">{selectedSchedule?.title}</Text>
                </View>
                {selectedSchedule?.description && (
                  <View className="items-center mb-3">
                    <Text className="text-gray-600 text-sm text-center">{selectedSchedule.description}</Text>
                  </View>
                )}
                <View className="gap-2 items-center">
                  {selectedSchedule?.start_at && (
                    <>
                      {format(new Date(selectedSchedule.start_at), 'HH:mm') === '00:00' ? (
                        <Text className="text-indigo-600 font-medium text-center">
                          {selectedSchedule.end_at && selectedSchedule.end_at.slice(0, 10) !== selectedSchedule.start_at.slice(0, 10)
                            ? `${format(new Date(selectedSchedule.start_at), 'M월 d일')} ~ ${format(new Date(selectedSchedule.end_at), 'M월 d일')}`
                            : `${format(new Date(selectedSchedule.start_at), 'M월 d일')}`}
                          · 하루종일
                        </Text>
                      ) : (
                        <Text className="text-indigo-600 font-medium text-center">
                          {format(new Date(selectedSchedule.start_at), 'M월 d일 HH:mm')}
                          {selectedSchedule.end_at ? ` ~ ${format(new Date(selectedSchedule.end_at), 'HH:mm')}` : ''}
                        </Text>
                      )}
                    </>
                  )}
                  {selectedSchedule?.location && (
                    <Text className="text-gray-600 text-center">📍 {selectedSchedule.location}</Text>
                  )}
                  {(selectedSchedule?.songs && selectedSchedule.songs.length > 0) || selectedSchedule?.song ? (
                    <View className="mt-2 w-full items-start">
                      <Text className="text-sm font-semibold text-gray-700 mb-2">연결된 특송</Text>
                      {selectedSchedule?.songs && selectedSchedule.songs.length > 0 ? (
                        selectedSchedule.songs.map((song, idx) => (
                          <TouchableOpacity
                            key={song.id}
                            onPress={() => {
                              setSelectedSongDetail(song);
                              setShowScheduleDetail(false);
                              setShowSongDetail(true);
                            }}
                            className="mb-2 w-full"
                          >
                            <View className="bg-purple-50 rounded-lg px-3 py-2 flex-row items-center">
                              <Text className="text-purple-600 font-medium flex-1">🎵 {song.title}</Text>
                              <Text className="text-purple-400 text-xs">▶</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : selectedSchedule?.song && (
                        <TouchableOpacity onPress={() => {
                          setSelectedSongDetail(selectedSchedule.song!);
                          setShowScheduleDetail(false);
                          setShowSongDetail(true);
                        }} className="w-full">
                          <Text className="text-purple-600 font-medium">🎵 {selectedSchedule.song.title} (탭하여 상세보기)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null}
                </View>
              </Card>

              {linkedVote ? (
                <Button
                  label={`${linkedVote.title} 투표보기`}
                  onPress={async () => {
                    setVoteSelected([]);
                    await fetchVoteDetail(linkedVote.id);
                    setShowVoteDetailModal(true);
                  }}
                  className="mt-2"
                />
              ) : profile?.is_executive ? (
                <Button
                  label="투표 생성"
                  onPress={() => {
                    // 기본 종료일: 3일 후
                    const endsAt = new Date();
                    endsAt.setDate(endsAt.getDate() + 3);
                    const endsAtString = endsAt.toISOString().slice(0, 16);

                    setVoteForm({ title: `${selectedSchedule?.title}`, description: '' });
                    setVoteEndsAt(endsAtString);
                    setVoteAnonymous(false);
                    setShowCreateVote(true);
                  }}
                  variant="outline"
                  className="mt-2"
                />
              ) : null}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Input
                label="제목"
                value={editForm.title}
                onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))}
                placeholder="일정 제목"
              />

              <View className="flex-row items-center justify-between py-3 mb-2 border border-gray-200 rounded-xl px-4 bg-white">
                <View>
                  <Text className="text-sm font-medium text-gray-700">하루종일</Text>
                  <Text className="text-xs text-gray-400">시간 없이 날짜만 설정</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setAllDay((v) => !v);
                    setEditForm((f) => ({ ...f, start_at: selectedDate, end_at: '' }));
                  }}
                  className={`w-12 h-7 rounded-full justify-center px-1 ${allDay ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <View className={`w-5 h-5 bg-white rounded-full shadow ${allDay ? 'self-end' : 'self-start'}`} />
                </TouchableOpacity>
              </View>

              {allDay ? (
                <>
                  <DatePickerField
                    label="시작 날짜"
                    value={editForm.start_at}
                    onChange={(v) => setEditForm((f) => ({ ...f, start_at: v }))}
                    mode="date"
                  />
                  <DatePickerField
                    label="종료 날짜 (선택)"
                    value={editForm.end_at}
                    onChange={(v) => setEditForm((f) => ({ ...f, end_at: v }))}
                    mode="date"
                    placeholder="하루짜리면 비워두세요"
                  />
                </>
              ) : (
                <>
                  <DateTimePickerField
                    label="시작일시"
                    value={editForm.start_at}
                    onChange={(v) => setEditForm((f) => ({ ...f, start_at: v }))}
                  />
                  <DateTimePickerField
                    label="종료일시 (선택)"
                    value={editForm.end_at}
                    onChange={(v) => setEditForm((f) => ({ ...f, end_at: v }))}
                  />
                </>
              )}

              <Input
                label="장소 (선택)"
                value={editForm.location}
                onChangeText={(v) => setEditForm((f) => ({ ...f, location: v }))}
                placeholder="장소"
              />

              <Text className="text-sm font-medium text-gray-700 mb-2">특송 연결 (선택)</Text>
              {selectedSongs.length > 0 && (
                <View className="mb-3 gap-2">
                  {selectedSongs.map((song, idx) => (
                    <View key={song.id} className="flex-row items-center justify-between bg-indigo-50 rounded-xl px-3 py-2">
                      <View className="flex-row items-center gap-2 flex-1">
                        <Text className="text-xs text-gray-400">{idx + 1}.</Text>
                        <Text className="text-sm text-indigo-900 font-medium flex-1">{song.title}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedSongs((prev) => prev.filter((s) => s.id !== song.id))}>
                        <Text className="text-indigo-400 text-lg">✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => { setSongSearch(''); setTempSelectedSongs(selectedSongs); setShowSongPicker(true); }}
                className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between bg-white mb-4"
              >
                <Text className="text-gray-400 text-base">+ 특송 추가...</Text>
                <Text className="text-gray-400">▼</Text>
              </TouchableOpacity>

              <Input
                label="설명 (선택)"
                value={editForm.description}
                onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))}
                placeholder="일정 설명"
                multiline
              />

              <View className="flex-row gap-3">
                <Button
                  label="삭제"
                  variant="outline"
                  onPress={() => handleDelete(selectedSchedule!.id)}
                  className="flex-1"
                />
                <Button
                  label="저장"
                  onPress={handleEditSchedule}
                  loading={saving}
                  className="flex-1"
                />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* 특송 상세보기 모달 */}
      {selectedSongDetail && (
        <Modal visible={showSongDetail} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => { setShowSongDetail(false); setSelectedSongDetail(null); }}>
                <Text className="text-gray-500">닫기</Text>
              </TouchableOpacity>
              <Text className="font-bold text-gray-900">특송 상세</Text>
              <View className="w-10" />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Card className="mb-4">
                <Text className="text-2xl font-bold text-gray-900 mb-2">{selectedSongDetail.title}</Text>
                {selectedSongDetail.description && (
                  <Text className="text-gray-600 text-sm mb-4">{selectedSongDetail.description}</Text>
                )}
                {(selectedSongDetail.youtube_links && selectedSongDetail.youtube_links.length > 0
                  ? selectedSongDetail.youtube_links
                  : selectedSongDetail.youtube_url ? [selectedSongDetail.youtube_url] : []
                ).map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => Linking.openURL(url)}
                    className="flex-row items-center bg-red-50 rounded-xl px-3 py-2 mb-2"
                  >
                    <Text className="text-red-500 mr-2">▶</Text>
                    <Text className="text-red-600 text-sm flex-1" numberOfLines={1}>
                      {selectedSongDetail.youtube_links && selectedSongDetail.youtube_links.length > 1
                        ? `유튜브 ${idx + 1}번 영상`
                        : '유튜브에서 보기'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {selectedSongDetail.files && selectedSongDetail.files.length > 0 && (
                  <View className="mt-4">
                    {selectedSongDetail.files.map((file: any) => (
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
          </SafeAreaView>
        </Modal>
      )}

      {/* 투표 생성 모달 */}
      <Modal visible={showCreateVote} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowCreateVote(false)}>
              <Text className="text-gray-500">취소</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">투표 생성</Text>
            <Button label="생성" size="sm" onPress={handleCreateVote} loading={savingVote} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Input
              label="투표 제목"
              value={voteForm.title}
              onChangeText={(v) => setVoteForm((f) => ({ ...f, title: v }))}
              placeholder="투표 제목"
            />

            <Input
              label="설명 (선택)"
              value={voteForm.description}
              onChangeText={(v) => setVoteForm((f) => ({ ...f, description: v }))}
              placeholder="투표 설명"
              multiline
            />

            <DateTimePickerField
              label="투표 종료일시"
              value={voteEndsAt}
              onChange={setVoteEndsAt}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">투표 항목 (최소 2개)</Text>
            {voteItems.map((item, idx) => (
              <View key={idx} className="flex-row items-center gap-2 mb-2">
                <View className="flex-1">
                  <Input
                    value={item}
                    onChangeText={(v) => setVoteItems((prev) => prev.map((i, i_idx) => i_idx === idx ? v : i))}
                    placeholder={`항목 ${idx + 1}`}
                  />
                </View>
                {voteItems.length > 2 && (
                  <TouchableOpacity onPress={() => setVoteItems((prev) => prev.filter((_, i) => i !== idx))}>
                    <Text className="text-red-400 text-lg pb-4">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setVoteItems((prev) => [...prev, ''])}
              className="border border-dashed border-indigo-200 rounded-xl py-2 items-center mb-4"
            >
              <Text className="text-indigo-400 text-sm">+ 항목 추가</Text>
            </TouchableOpacity>

            <View className="flex-row items-center justify-between py-3 mb-3 border border-gray-200 rounded-xl px-4 bg-white">
              <Text className="text-sm font-medium text-gray-700">복수선택</Text>
              <TouchableOpacity
                onPress={() => setVoteMultipleChoice((v) => !v)}
                className={`w-12 h-7 rounded-full justify-center px-1 ${voteMultipleChoice ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 bg-white rounded-full shadow ${voteMultipleChoice ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between py-3 border border-gray-200 rounded-xl px-4 bg-white">
              <Text className="text-sm font-medium text-gray-700">익명 투표</Text>
              <TouchableOpacity
                onPress={() => setVoteAnonymous((v) => !v)}
                className={`w-12 h-7 rounded-full justify-center px-1 ${voteAnonymous ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 bg-white rounded-full shadow ${voteAnonymous ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 투표 상세 모달 */}
      <Modal visible={showVoteDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setShowVoteDetailModal(false); setVoteIsEditing(false); }}>
              <Text className="text-gray-500">닫기</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">{voteIsEditing ? '투표 수정' : '투표 상세'}</Text>
            <View className="flex-row gap-2">
              {voteCanEditVote && !voteIsEditing && (
                <>
                  <TouchableOpacity onPress={handleVoteEditOpen}>
                    <Text className="text-indigo-600 font-medium text-sm">수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleVoteDelete}>
                    <Text className="text-red-600 font-medium text-sm">삭제</Text>
                  </TouchableOpacity>
                </>
              )}
              {voteIsEditing && (
                <TouchableOpacity onPress={() => setVoteIsEditing(false)}>
                  <Text className="text-gray-500 font-medium text-sm">취소</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {selectedVoteDetail && !voteIsEditing ? (
              <>
                <Card className="mb-4">
                  <Text className="text-xl font-bold text-gray-900 mb-2">{selectedVoteDetail.title}</Text>
                  {selectedVoteDetail.description && <Text className="text-gray-500 text-sm mb-3">{selectedVoteDetail.description}</Text>}
                  <View className="flex-row flex-wrap gap-2">
                    {selectedVoteDetail.multiple_choice && <Text className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">복수선택</Text>}
                    {voteIsExpired && <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">종료됨</Text>}
                    {selectedVoteDetail.ends_at && (
                      <Text className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                        ~{format(new Date(selectedVoteDetail.ends_at), 'M월 d일 HH:mm', { locale: ko })}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center justify-between mt-3">
                    <Text className="text-sm text-gray-500">총 {voteTotalVoters}명 참여</Text>
                    <TouchableOpacity onPress={() => setVoteShowParticipants(true)} className="bg-indigo-50 px-3 py-1 rounded-lg">
                      <Text className="text-xs text-indigo-600 font-medium">참여자 현황</Text>
                    </TouchableOpacity>
                  </View>
                </Card>

                <Text className="text-base font-semibold text-gray-800 mb-3">투표 항목</Text>
                {selectedVoteDetail.items?.map((item) => {
                  const isSelected = voteSelected.includes(item.id);
                  const responseCount = item.responses?.length ?? 0;
                  const hasResponses = responseCount > 0;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => !voteIsExpired && !hasResponses && (selectedVoteDetail.multiple_choice ?
                        setVoteSelected((prev) => prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id])
                        : setVoteSelected([item.id])
                      )}
                      disabled={voteIsExpired || hasResponses}
                      className={`mb-2 p-3 rounded-lg border-2 ${isSelected ? 'bg-indigo-50 border-indigo-500' : 'border-gray-200 bg-white'} ${(voteIsExpired || hasResponses) ? 'opacity-70' : ''}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-sm font-medium flex-1 ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>{item.label}</Text>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-xs text-gray-500">{responseCount}명</Text>
                          {selectedVoteDetail.multiple_choice ? (
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

                {!voteIsExpired && (
                  <View className="flex-row gap-2 mt-5">
                    <Button
                      label={voteHasVoted ? '재투표' : '투표하기'}
                      onPress={handleVoteSubmit}
                      loading={voteSubmitting}
                      className="flex-1"
                    />
                    {voteCanEditVote && voteNonVoters.length > 0 && (
                      <Button
                        label={`미참여(${voteNonVoters.length})`}
                        variant="outline"
                        onPress={() => {
                          setVoteSelectedNonVoters(new Set());
                          setVoteShowNonVotersModal(true);
                        }}
                        className="flex-1"
                      />
                    )}
                  </View>
                )}
              </>
            ) : selectedVoteDetail && voteIsEditing ? (
              <>
                <Input
                  label="투표 제목"
                  value={voteEditForm.title}
                  onChangeText={(v) => setVoteEditForm((f) => ({ ...f, title: v }))}
                  placeholder="투표 제목"
                />
                <Input
                  label="설명 (선택)"
                  value={voteEditForm.description}
                  onChangeText={(v) => setVoteEditForm((f) => ({ ...f, description: v }))}
                  placeholder="투표 설명"
                  multiline
                />
                <Text className="text-sm font-medium text-gray-700 mb-2 mt-2">투표 항목 (최소 2개)</Text>
                {voteEditItems.map((item, idx) => {
                  const hasResponses = selectedVoteDetail?.items?.[idx]?.responses && (selectedVoteDetail.items[idx].responses?.length ?? 0) > 0;
                  const responseCount = selectedVoteDetail?.items?.[idx]?.responses?.length ?? 0;
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
                            onChangeText={(v) => setVoteEditItems((prev) => prev.map((it, i) => i === idx ? v : it))}
                            placeholder={`항목 ${idx + 1}`}
                            editable={!hasResponses}
                          />
                        </View>
                        {voteEditItems.length > 2 && !hasResponses && (
                          <TouchableOpacity onPress={() => setVoteEditItems((prev) => prev.filter((_, i) => i !== idx))}>
                            <Text className="text-red-400 text-lg">✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
                {voteEditItems.filter(Boolean).length < 5 && (
                  <TouchableOpacity
                    onPress={() => setVoteEditItems((prev) => [...prev, ''])}
                    className="border border-dashed border-indigo-300 rounded-lg py-2 items-center mb-4"
                  >
                    <Text className="text-indigo-600 text-sm">+ 항목 추가</Text>
                  </TouchableOpacity>
                )}
                <Button
                  label="저장"
                  onPress={handleVoteEditSave}
                  loading={voteSavingEdit}
                />
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 참여자 현황 모달 */}
      <Modal visible={voteShowParticipants} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setVoteShowParticipants(false)}>
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
              const votes = getVoteUserVotes(member.id);
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
      <Modal visible={voteShowNonVotersModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setVoteShowNonVotersModal(false); setVoteSelectedNonVoters(new Set()); }}>
              <Text className="text-gray-500">닫기</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900">미참여자 알림</Text>
            <TouchableOpacity onPress={() => {
              if (voteSelectedNonVoters.size === voteNonVoters.length) {
                setVoteSelectedNonVoters(new Set());
              } else {
                setVoteSelectedNonVoters(new Set(voteNonVoters.map((m) => m.id)));
              }
            }}>
              <Text className="text-indigo-600 font-medium text-sm">
                {voteSelectedNonVoters.size === voteNonVoters.length ? '전체해제' : '전체선택'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={voteNonVoters}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-gray-400">미참여 단원이 없습니다</Text>
              </View>
            }
            renderItem={({ item: member }) => {
              const isSelected = voteSelectedNonVoters.has(member.id);
              return (
                <TouchableOpacity
                  onPress={() => {
                    const newSet = new Set(voteSelectedNonVoters);
                    if (isSelected) {
                      newSet.delete(member.id);
                    } else {
                      newSet.add(member.id);
                    }
                    setVoteSelectedNonVoters(newSet);
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
              label={`${voteSelectedNonVoters.size}명에게 알림 보내기`}
              onPress={handleVoteNotifyNonVoters}
              loading={voteNotifying}
              disabled={voteSelectedNonVoters.size === 0}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* 년/월 선택 피커 모달 */}
      <Modal visible={showYearMonthPicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl pb-8">
            {/* 헤더 */}
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => setShowYearMonthPicker(false)}>
                <Text className="text-gray-500 text-base">취소</Text>
              </TouchableOpacity>
              <Text className="font-bold text-gray-900">년월 선택</Text>
              <TouchableOpacity
                onPress={() => {
                  if (selectedDate) {
                    // 현재 선택된 날의 일자 추출
                    const selectedDateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
                    const day = selectedDateObj.getDate();

                    // 새로운 년/월의 마지막 일자 확인
                    const lastDay = new Date(pickerYear, pickerMonth, 0).getDate();
                    const safeDay = Math.min(day, lastDay);

                    // 새로운 년/월의 유효한 일자로 설정
                    const newDateObj = new Date(pickerYear, pickerMonth - 1, safeDay);
                    const newDateString = format(newDateObj, 'yyyy-MM-dd');
                    setSelectedDate(newDateString);
                    setDisplayedMonth(newDateString);
                  }
                  setShowYearMonthPicker(false);
                }}
              >
                <Text className="text-indigo-600 font-semibold text-base">확인</Text>
              </TouchableOpacity>
            </View>

            {/* 선택된 값 표시 */}
            <View className="items-center py-3">
              <Text className="text-lg font-bold text-indigo-600">
                {pickerYear}년 {pickerMonth}월
              </Text>
            </View>

            {/* 년/월 컬럼 */}
            <View className="flex-row" style={{ height: 240 }}>
              {/* 년 */}
              <View className="flex-1 border-r border-gray-100">
                <Text className="text-center text-xs text-gray-400 py-2">년</Text>
                <FlatList
                  data={Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i)}
                  keyExtractor={(y) => String(y)}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: year }) => (
                    <TouchableOpacity
                      onPress={() => setPickerYear(year)}
                      className={`py-3 items-center ${year === pickerYear ? 'bg-indigo-50' : ''}`}
                    >
                      <Text className={`text-base ${year === pickerYear ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}>
                        {year}년
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* 월 */}
              <View className="flex-1">
                <Text className="text-center text-xs text-gray-400 py-2">월</Text>
                <FlatList
                  data={Array.from({ length: 12 }, (_, i) => i + 1)}
                  keyExtractor={(m) => String(m)}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: month }) => (
                    <TouchableOpacity
                      onPress={() => setPickerMonth(month)}
                      className={`py-3 items-center ${month === pickerMonth ? 'bg-indigo-50' : ''}`}
                    >
                      <Text className={`text-base ${month === pickerMonth ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}>
                        {month}월
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
