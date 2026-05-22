import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { PART_LABELS, ROLE_LABELS, Part } from '@/types';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { FeastDayPicker } from '@/components/ui/FeastDayPicker';

const PARTS: Part[] = ['soprano', 'alto', 'tenor', 'bass'];

export default function ProfileScreen() {
  const { profile, fetchProfile, session, setProfile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    baptismal_name: profile?.baptismal_name ?? '',
    phone: profile?.phone ?? '',
    birthday: profile?.birthday ?? '',
    feast_day: profile?.feast_day ?? '',
    part: profile?.part ?? null as Part | null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ ...form }).eq('id', profile.id);
    if (error) {
      Alert.alert('오류', '저장에 실패했습니다.');
    } else {
      setProfile({ ...profile, ...form });
      await fetchProfile(profile.id);
      setEditing(false);
    }
    setSaving(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const path = `avatars/${profile?.id}/${Date.now()}.jpg`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        await supabase.from('profiles').update({ profile_image: publicUrl }).eq('id', profile!.id);
        if (session?.user) await fetchProfile(session.user.id);
      }
    }
  };

  if (!profile) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-indigo-600 text-base">← 뒤로</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1">내 프로필</Text>
        {!editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text className="text-indigo-600 font-medium">수정</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {/* 프로필 사진 */}
        <TouchableOpacity onPress={handlePickImage} className="items-center mb-6">
          <View className="w-24 h-24 bg-indigo-100 rounded-full items-center justify-center mb-2">
            <Text className="text-4xl">{profile.part === 'soprano' || profile.part === 'alto' ? '👩' : '👨'}</Text>
          </View>
          <Text className="text-indigo-600 text-sm">사진 변경</Text>
        </TouchableOpacity>

        {/* 헤더 카드 */}
        <Card className="mb-4 bg-indigo-600 items-center">
          <Text className="text-white text-xl font-bold">{profile.name}</Text>
          {profile.baptismal_name && (
            <Text className="text-white text-base font-bold mt-1">{profile.baptismal_name}</Text>
          )}
          <View className="flex-row gap-2 mt-3">
            {profile.part && <View className="bg-indigo-500 rounded-full px-3 py-1"><Text className="text-white text-xs">{PART_LABELS[profile.part]}</Text></View>}
            <View className="bg-indigo-500 rounded-full px-3 py-1"><Text className="text-white text-xs">{ROLE_LABELS[profile.role]}</Text></View>
          </View>
        </Card>

        {editing ? (
          <Card>
            <Input label="이름" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Input label="세례명" value={form.baptismal_name} onChangeText={(v) => setForm((f) => ({ ...f, baptismal_name: v }))} />
            <Input label="전화번호" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="010-0000-0000" keyboardType="phone-pad" />

            <DatePickerField
              label="생년월일"
              value={form.birthday}
              onChange={(v) => setForm((f) => ({ ...f, birthday: v }))}
              mode="date"
            />
            <FeastDayPicker
              label="축일"
              value={form.feast_day}
              onChange={(v) => setForm((f) => ({ ...f, feast_day: v }))}
            />

            <View className="mb-4">
              <Text className="text-xs text-gray-500 mb-2">파트</Text>
              <View className="flex-row flex-wrap gap-2">
                {PARTS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setForm((f) => ({ ...f, part: p }))}
                    className={`px-3 py-1.5 rounded-full border ${form.part === p ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}
                  >
                    <Text className={`text-xs ${form.part === p ? 'text-white' : 'text-gray-600'}`}>{PART_LABELS[p]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-row gap-3">
              <Button label="취소" variant="outline" onPress={() => setEditing(false)} className="flex-1" />
              <Button label="저장" onPress={handleSave} loading={saving} className="flex-1" />
            </View>
          </Card>
        ) : (
          <Card>
            {[
              { label: '세례명', value: profile.baptismal_name },
              { label: '전화번호', value: profile.phone },
              { label: '생년월일', value: profile.birthday?.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1년 $2월 $3일') },
              { label: '축일', value: profile.feast_day?.replace(/(\d{2})-(\d{2})/, '$1월 $2일') },
            ].map(({ label, value }) => (
              <View key={label} className="flex-row py-3 border-b border-gray-100">
                <Text className="text-gray-500 w-24 text-sm">{label}</Text>
                <Text className="text-gray-900 flex-1 text-sm">{value ?? '-'}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
