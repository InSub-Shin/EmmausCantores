import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Profile, PART_LABELS, ROLE_LABELS, Part, Role, EXECUTIVE_ROLES } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, formatPhoneNumber } from '@/components/ui/Input';
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
  const canChangeRole = isLeader && !isSelf; // 단장만 직책 변경 가능 (단, 본인은 제외)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', id).single().then(({ data }) => {
      if (data) { setMember(data as Profile); setForm(data as Profile); }
    });
  }, [id]);

  const handleSave = async () => {
    if (!member) return;

    // 단장 역할 변경 처리
    if (canChangeRole && form.role === 'leader' && member.role !== 'leader') {
      return Alert.alert(
        '단장 직책 변경',
        `${member.name}을(를) 단장으로 지정하시겠습니까?\n\n현재 단장인 ${myProfile?.name}님은 평단원으로 변경됩니다.`,
        [
          { text: '취소', onPress: () => {}, style: 'cancel' },
          {
            text: '확인',
            onPress: async () => {
              await performSave(true); // isLeaderChange = true
            },
          },
        ]
      );
    }

    await performSave(false);
  };

  const performSave = async (isLeaderChange: boolean) => {
    if (!member || !myProfile) return;
    setSaving(true);

    try {
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

      // 단장 변경 시 기존 단장을 평단원으로 변경
      if (isLeaderChange) {
        const { error: leaderError } = await supabase
          .from('profiles')
          .update({ role: 'member', is_executive: false })
          .eq('id', myProfile.id);

        if (leaderError) {
          Alert.alert('오류', '단장 변경에 실패했습니다.');
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', id);
      if (error) {
        Alert.alert('오류', '저장에 실패했습니다: ' + error.message);
        setSaving(false);
        return;
      }

      // 탈퇴/복구는 RLS 우회 RPC로 처리 (is_deleted 직접 UPDATE가 RLS에 막히는 문제 우회)
      const targetDeleted = form.is_deleted ?? false;
      if (targetDeleted !== member.is_deleted) {
        const { error: delErr } = await supabase.rpc('admin_set_member_deleted', {
          p_id: id,
          p_deleted: targetDeleted,
        });
        if (delErr) {
          Alert.alert('오류', '탈퇴 처리에 실패했습니다: ' + delErr.message);
          setSaving(false);
          return;
        }
      }

      if (targetDeleted) {
        // 탈퇴 처리 시 목록으로 돌아가기
        Alert.alert('완료', `${member.name}님이 탈퇴 처리되었습니다.`, [
          { text: '확인', onPress: () => router.back() },
        ]);
      } else {
        setMember({ ...member, ...updateData, is_deleted: false } as Profile);
        setEditing(false);
        if (isLeaderChange) {
          Alert.alert('완료', `${member.name}님이 새로운 단장이 되었습니다.`);
        }
      }
    } catch (error) {
      Alert.alert('오류', '저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  if (!member) return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50 items-center justify-center">
      <Text className="text-gray-400">불러오는 중...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
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
        <View className="items-center mb-4 bg-white rounded-2xl p-4">
          <View className="w-20 h-20 bg-indigo-400 rounded-full items-center justify-center mb-3">
            <Text className="text-4xl">{member.part === 'soprano' || member.part === 'alto' ? '👩' : '👨'}</Text>
          </View>
          <Text className="text-gray-900 text-base font-medium mt-1">
            {member.baptismal_name || '-'}
          </Text>
          <View className="flex-row gap-2 mt-3">
            {member.part && <View className="bg-indigo-500 rounded-full px-3 py-1"><Text className="text-white text-xs">{PART_LABELS[member.part]}</Text></View>}
            <View className={`rounded-full px-3 py-1 ${member.is_executive ? 'bg-amber-500' : 'bg-indigo-500'}`}>
              <Text className="text-white text-xs">{ROLE_LABELS[member.role]}</Text>
            </View>
          </View>
        </View>

        {editing ? (
          <Card>
            <Input label="이름" value={(form.name as string) ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Input label="세례명" value={(form.baptismal_name as string) ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, baptismal_name: v }))} />
            <Input label="전화번호" value={(form.phone as string) ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="010-0000-0000" phoneFormat />

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

            {isLeader && isSelf ? (
              <View className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Text className="text-xs text-amber-700 font-medium">
                  단장은 최소 1명이 필요하므로 본인의 직책을 변경할 수 없습니다.
                </Text>
              </View>
            ) : canChangeRole ? (
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
            ) : null}

            {/* 탈퇴 처리 (임원만, 본인 제외) */}
            {isExecutive && !isSelf && (
              <TouchableOpacity
                onPress={() => setForm((f) => ({ ...f, is_deleted: !f.is_deleted }))}
                className={`flex-row items-center gap-3 rounded-xl px-4 py-3 mb-4 border ${
                  form.is_deleted
                    ? 'bg-red-50 border-red-400'
                    : 'bg-white border-gray-200'
                }`}
              >
                <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
                  form.is_deleted ? 'bg-red-500 border-red-500' : 'border-gray-300'
                }`}>
                  {form.is_deleted && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-semibold ${form.is_deleted ? 'text-red-600' : 'text-gray-700'}`}>
                    탈퇴 처리
                  </Text>
                  {form.is_deleted && (
                    <Text className="text-red-400 text-xs mt-0.5">저장 시 단원 목록에서 제외됩니다</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            <View className="flex-row gap-3">
              <Button label="취소" variant="outline" onPress={() => setEditing(false)} className="flex-1" />
              <Button label="저장" onPress={handleSave} loading={saving} className="flex-1" />
            </View>
          </Card>
        ) : (
          <Card>
            {[
              { label: '전화번호', value: member.phone ? formatPhoneNumber(member.phone) : null },
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
