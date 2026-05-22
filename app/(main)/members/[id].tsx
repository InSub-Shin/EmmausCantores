import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Profile, PART_LABELS, ROLE_LABELS, Part, Role, EXECUTIVE_ROLES } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { FeastDayPicker } from '@/components/ui/FeastDayPicker';

const PARTS: Part[] = ['soprano', 'alto', 'tenor', 'bass'];
const ROLES: Role[] = ['member', 'leader', 'vice_leader', 'male_part_leader', 'female_part_leader', 'score_manager', 'treasurer', 'planner', 'pr'];

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: myProfile } = useAuthStore();
  const [member, setMember] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  const isLeader = myProfile?.role === 'leader';
  const isExecutive = myProfile?.is_executive;
  const isSelf = myProfile?.id === id;
  const canEdit = isExecutive || isSelf;
  const canChangeRole = isLeader; // 단장만 직책 변경 가능

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', id).single().then(({ data }) => {
      if (data) { setMember(data as Profile); setForm(data as Profile); }
    });
  }, [id]);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    const updateData: Partial<Profile> = {
      name: form.name,
      baptismal_name: form.baptismal_name,
      phone: form.phone,
      birthday: form.birthday,
      feast_day: form.feast_day,
      part: form.part,
    };
    if (canChangeRole) {
      updateData.role = form.role;
      updateData.is_executive = form.role ? EXECUTIVE_ROLES.includes(form.role as Role) : false;
    }
    const { error } = await supabase.from('profiles').update(updateData).eq('id', id);
    if (error) Alert.alert('오류', '저장에 실패했습니다.');
    else { setMember({ ...member, ...updateData } as Profile); setEditing(false); }
    setSaving(false);
  };

  if (!member) return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
      <Text className="text-gray-400">불러오는 중...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-indigo-600 text-base">← 뒤로</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1">{member.name}</Text>
        {canEdit && !editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text className="text-indigo-600 font-medium">수정</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {/* 프로필 헤더 */}
        <Card className="items-center mb-4 bg-indigo-600">
          <View className="w-20 h-20 bg-indigo-400 rounded-full items-center justify-center mb-3">
            <Text className="text-4xl">{member.part === 'soprano' || member.part === 'alto' ? '👩' : '👨'}</Text>
          </View>
          <Text className="text-white text-2xl font-bold">{member.name}</Text>
          {member.baptismal_name && (
            <Text className="text-white text-base font-bold mt-1">{member.baptismal_name}</Text>
          )}
          <View className="flex-row gap-2 mt-3">
            {member.part && <View className="bg-indigo-500 rounded-full px-3 py-1"><Text className="text-white text-xs">{PART_LABELS[member.part]}</Text></View>}
            <View className={`rounded-full px-3 py-1 ${member.is_executive ? 'bg-amber-500' : 'bg-indigo-500'}`}>
              <Text className="text-white text-xs">{ROLE_LABELS[member.role]}</Text>
            </View>
          </View>
        </Card>

        {editing ? (
          <Card>
            <Input label="이름" value={(form.name as string) ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Input label="세례명" value={(form.baptismal_name as string) ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, baptismal_name: v }))} />
            <Input label="전화번호" value={(form.phone as string) ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="010-0000-0000" keyboardType="phone-pad" />

            <DatePickerField
              label="생년월일"
              value={(form.birthday as string) ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, birthday: v }))}
              mode="date"
            />
            <FeastDayPicker
              label="축일"
              value={(form.feast_day as string) ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, feast_day: v }))}
            />

            <View className="mb-4">
              <Text className="text-xs text-gray-500 mb-2">파트</Text>
              <View className="flex-row flex-wrap gap-2">
                {PARTS.map((p) => (
                  <TouchableOpacity key={p} onPress={() => setForm((f) => ({ ...f, part: p }))}
                    className={`px-3 py-1.5 rounded-full border ${form.part === p ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                    <Text className={`text-xs ${form.part === p ? 'text-white' : 'text-gray-600'}`}>{PART_LABELS[p]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {canChangeRole && (
              <View className="mb-4">
                <Text className="text-xs text-gray-500 mb-1">직책 (단장 권한)</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <TouchableOpacity key={r} onPress={() => setForm((f) => ({ ...f, role: r }))}
                      className={`px-3 py-1.5 rounded-full border ${form.role === r ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-300'}`}>
                      <Text className={`text-xs ${form.role === r ? 'text-white' : 'text-gray-600'}`}>{ROLE_LABELS[r]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View className="flex-row gap-3">
              <Button label="취소" variant="outline" onPress={() => setEditing(false)} className="flex-1" />
              <Button label="저장" onPress={handleSave} loading={saving} className="flex-1" />
            </View>
          </Card>
        ) : (
          <Card>
            {[
              { label: '전화번호', value: member.phone },
              { label: '생년월일', value: member.birthday?.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1년 $2월 $3일') },
              { label: '축일', value: member.feast_day?.replace(/(\d{2})-(\d{2})/, '$1월 $2일') },
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
