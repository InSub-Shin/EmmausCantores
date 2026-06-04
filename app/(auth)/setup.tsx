import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { FeastDayPicker } from '@/components/ui/FeastDayPicker';
import { PART_LABELS, Part } from '@/types';

const PARTS: Part[] = ['soprano', 'alto', 'tenor', 'bass'];

const PART_EMOJI: Record<Part, string> = {
  soprano: '🎵',
  alto: '🎶',
  tenor: '🎤',
  bass: '🎸',
};

function RequiredLabel({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1 mb-1">
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
      <Text className="text-red-500 text-sm">*</Text>
    </View>
  );
}

export default function SetupScreen() {
  const { profile, setProfile, fetchProfile } = useAuthStore();

  const [part, setPart] = useState<Part | null>(profile?.part ?? null);
  const [baptismalName, setBaptismalName] = useState(profile?.baptismal_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [birthday, setBirthday] = useState(profile?.birthday ?? '');
  const [feastDay, setFeastDay] = useState(profile?.feast_day ?? '');
  const [saving, setSaving] = useState(false);

  // 화면 진입 시 최신 프로필 로드 (이름이 없으면 재조회)
  useEffect(() => {
    if (!profile?.name) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) fetchProfile(data.user.id);
      });
    }
  }, []);

  const handleComplete = async () => {
    if (!part) {
      Alert.alert('입력 오류', '파트를 선택해주세요.');
      return;
    }
    if (!phone) {
      Alert.alert('입력 오류', '전화번호를 입력해주세요.');
      return;
    }
    if (!birthday) {
      Alert.alert('입력 오류', '생일을 선택해주세요.');
      return;
    }
    if (!profile) return;
    setSaving(true);
    try {
      const updates = {
        part,
        baptismal_name: baptismalName.trim() || null,
        phone,
        birthday,
        feast_day: feastDay || null,
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, ...updates });
      router.replace('/(main)/home');
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = !!part && !!phone && !!birthday;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* 헤더 */}
          <View className="mb-8">
            <Text className="text-2xl font-bold text-gray-900 mb-1">프로필 설정</Text>
            <Text className="text-gray-500 text-sm">
              {profile?.name ? `${profile.name}님, 반갑습니다!` : '반갑습니다!'}{'\n'}
              단원 정보를 입력하면 더 편리하게 이용할 수 있습니다.
            </Text>
          </View>

          {/* 파트 선택 (필수) */}
          <View className="mb-5">
            <View className="flex-row items-center gap-1 mb-3">
              <Text className="text-sm font-medium text-gray-700">파트</Text>
              <Text className="text-red-500 text-sm">*</Text>
            </View>
            <View className="flex-row gap-2">
              {PARTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPart(p)}
                  className={`flex-1 items-center py-3 rounded-xl border-2 ${
                    part === p ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className="text-lg mb-0.5">{PART_EMOJI[p]}</Text>
                  <Text className={`text-xs font-semibold ${part === p ? 'text-white' : 'text-gray-600'}`}>
                    {PART_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 전화번호 (필수) */}
          <View>
            <RequiredLabel label="전화번호" />
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="010-0000-0000"
              phoneFormat
            />
          </View>

          {/* 생일 (필수) */}
          <View>
            <RequiredLabel label="생일" />
            <DatePickerField
              value={birthday}
              onChange={setBirthday}
              mode="date"
              placeholder="생일 선택"
            />
          </View>

          {/* 구분선 */}
          <View className="flex-row items-center gap-3 mb-5">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-gray-400 text-xs">선택 사항</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* 세례명 (선택) */}
          <Input
            label="세례명"
            value={baptismalName}
            onChangeText={setBaptismalName}
            placeholder="예) 베드로, 마리아"
          />

          {/* 축일 (선택) */}
          <FeastDayPicker
            label="축일"
            value={feastDay}
            onChange={setFeastDay}
          />

          {/* 완료 버튼 */}
          <TouchableOpacity
            onPress={handleComplete}
            disabled={saving}
            className={`w-full py-4 rounded-2xl items-center mt-2 mb-3 ${
              isComplete ? 'bg-indigo-500' : 'bg-gray-200'
            }`}
          >
            <Text className={`text-base font-bold ${isComplete ? 'text-white' : 'text-gray-400'}`}>
              {saving ? '저장 중...' : '완료'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(main)/home')} className="items-center py-2">
            <Text className="text-gray-400 text-sm">나중에 설정하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
