import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { sendPushToUsers } from '@/lib/notifications';

// 3일 후 기본 마감일
const defaultDeadline = () => addDays(new Date(), 3).toISOString();

export default function CreateVoteScreen() {
  const { profile } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [endsAt, setEndsAt] = useState(defaultDeadline());
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('입력 오류', '투표 제목을 입력해주세요.'); return; }
    const validItems = items.filter((i) => i.trim());
    if (validItems.length < 2) { Alert.alert('입력 오류', '최소 2개의 항목이 필요합니다.'); return; }

    setSaving(true);
    const { data: voteData, error } = await supabase
      .from('votes')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        multiple_choice: multipleChoice,
        ends_at: endsAt || null,
        created_by: profile?.id,
      })
      .select()
      .single();

    if (error || !voteData) { Alert.alert('오류', '투표 생성에 실패했습니다.'); setSaving(false); return; }

    const itemRows = validItems.map((label, idx) => ({
      vote_id: voteData.id,
      label: label.trim(),
      order_index: idx,
    }));
    await supabase.from('vote_items').insert(itemRows);

    // 전체 단원 푸시 알림
    const { data: members } = await supabase.from('profiles').select('push_token').not('push_token', 'is', null);
    const tokens = (members ?? []).map((m: { push_token: string | null }) => m.push_token).filter(Boolean) as string[];
    if (tokens.length > 0) {
      await sendPushToUsers(tokens, '새 투표가 등록되었습니다', `"${title}" 투표에 참여해주세요!`, { voteId: voteData.id });
    }

    Alert.alert('완료', '투표가 생성되었습니다.');
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-indigo-600 text-base">← 취소</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">새 투표 만들기</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Card className="mb-4">
          <Input label="투표 제목" value={title} onChangeText={setTitle} placeholder="예: 이번 주 주일미사 참여 여부" />
          <Input label="설명 (선택)" value={description} onChangeText={setDescription} placeholder="투표에 대한 설명" multiline />

          <DateTimePickerField
            label="투표 마감일 (기본: 3일 후)"
            value={endsAt}
            onChange={setEndsAt}
          />

          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm font-medium text-gray-700">복수 선택 허용</Text>
            <Switch value={multipleChoice} onValueChange={setMultipleChoice} trackColor={{ true: '#4f46e5' }} />
          </View>
        </Card>

        <Text className="text-base font-semibold text-gray-800 mb-3">투표 항목</Text>
        <Card className="mb-4">
          {items.map((item, idx) => (
            <View key={idx} className="flex-row items-center mb-2 gap-2">
              <Text className="text-gray-400 w-5 text-sm text-center">{idx + 1}</Text>
              <View className="flex-1">
                <Input
                  value={item}
                  onChangeText={(v) => setItems((prev) => prev.map((it, i) => i === idx ? v : it))}
                  placeholder={`항목 ${idx + 1}`}
                />
              </View>
              {items.length > 2 && (
                <TouchableOpacity onPress={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                  <Text className="text-red-400 text-lg">✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setItems((prev) => [...prev, ''])}
            className="items-center py-2 border border-dashed border-gray-300 rounded-xl mt-1"
          >
            <Text className="text-gray-400 text-sm">+ 항목 추가</Text>
          </TouchableOpacity>
        </Card>

        <Button label="투표 생성하기" onPress={handleCreate} loading={saving} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}
