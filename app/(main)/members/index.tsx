import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
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
const PART_FILTER = ['all', 'soprano', 'alto', 'tenor', 'bass'] as const;
const PART_FILTER_LABELS: Record<string, string> = { all: '전체', ...PART_LABELS };

const emptyForm = { name: '', baptismal_name: '', phone: '', birthday: '', feast_day: '', part: 'soprano' as Part, role: 'member' as Role };

export default function MembersScreen() {
  const { profile: myProfile } = useAuthStore();
  const [members, setMembers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const isLeader = myProfile?.role === 'leader';
  const isExecutive = myProfile?.is_executive;

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('is_deleted', false).order('name');
    if (data) setMembers(data as Profile[]);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  useEffect(() => {
    let result = members;
    if (selectedPart !== 'all') result = result.filter((m) => m.part === selectedPart);
    if (search) result = result.filter((m) => m.name?.includes(search) || m.baptismal_name?.includes(search));
    setFiltered(result);
  }, [members, selectedPart, search]);

  const onRefresh = async () => { setRefreshing(true); await fetchMembers(); setRefreshing(false); };

  const handleAddMember = async () => {
    if (!form.name.trim()) { Alert.alert('입력 오류', '이름을 입력해주세요.'); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').insert({
      id: Crypto.randomUUID(),
      name: form.name.trim(),
      baptismal_name: form.baptismal_name.trim() || null,
      phone: form.phone.trim() || null,
      birthday: form.birthday || null,
      feast_day: form.feast_day || null,
      part: form.part,
      role: form.role,
      is_executive: EXECUTIVE_ROLES.includes(form.role),
    });
    if (error) Alert.alert('오류', '단원 추가에 실패했습니다: ' + error.message);
    else { setShowAdd(false); setForm(emptyForm); await fetchMembers(); }
    setSaving(false);
  };

  const handleDelete = (member: Profile) => {
    Alert.alert('단원 삭제', `${member.name} 단원을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await supabase.from('profiles').update({ is_deleted: true }).eq('id', member.id);
        await fetchMembers();
      }},
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">단원 목록</Text>
          {isExecutive && (
            <TouchableOpacity onPress={() => setShowAdd(true)} className="bg-indigo-600 rounded-xl px-4 py-2">
              <Text className="text-white font-medium text-sm">+ 단원 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center mb-3">
          <Text className="mr-2 text-gray-400">🔍</Text>
          <TextInput className="flex-1 text-base text-gray-900" placeholder="이름 또는 세례명 검색" placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row gap-2">
            {PART_FILTER.map((part) => (
              <TouchableOpacity
                key={part}
                onPress={() => setSelectedPart(part)}
                className={`px-3 py-1.5 rounded-full border ${selectedPart === part ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}
              >
                <Text className={`text-xs font-medium ${selectedPart === part ? 'text-white' : 'text-gray-600'}`}>
                  {PART_FILTER_LABELS[part]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* 명수 */}
        <Text className="text-sm text-gray-500">
          전체 {members.length}명 · 현재 {filtered.length}명
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<View className="items-center py-12"><Text className="text-gray-400">단원이 없습니다</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(main)/members/${item.id}`)} className="mb-3">
            <Card className="flex-row items-center">
              <View className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center mr-4">
                <Text className="text-xl">{item.part === 'soprano' || item.part === 'alto' ? '👩' : '👨'}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
                  {item.baptismal_name && <Text className="text-xs text-gray-400">({item.baptismal_name})</Text>}
                </View>
                <View className="flex-row gap-1.5">
                  {item.part && <Text className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{PART_LABELS[item.part]}</Text>}
                  <Text className={`text-xs px-2 py-0.5 rounded-full ${item.is_executive ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-100'}`}>
                    {ROLE_LABELS[item.role]}
                  </Text>
                </View>
              </View>
              {isLeader && (
                <TouchableOpacity onPress={() => handleDelete(item)} className="p-2">
                  <Text className="text-red-400 text-base">🗑</Text>
                </TouchableOpacity>
              )}
              <Text className="text-gray-400 ml-1">›</Text>
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* 단원 추가 모달 */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowAdd(false)}><Text className="text-gray-500">취소</Text></TouchableOpacity>
            <Text className="font-bold text-gray-900">단원 추가</Text>
            <Button label="저장" size="sm" onPress={handleAddMember} loading={saving} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Input label="이름 *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="홍길동" />
            <Input label="세례명" value={form.baptismal_name} onChangeText={(v) => setForm((f) => ({ ...f, baptismal_name: v }))} />
            <Input label="전화번호" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="010-0000-0000" keyboardType="phone-pad" />

            <DatePickerField label="생년월일" value={form.birthday} onChange={(v) => setForm((f) => ({ ...f, birthday: v }))} mode="date" />
            <FeastDayPicker label="축일" value={form.feast_day} onChange={(v) => setForm((f) => ({ ...f, feast_day: v }))} />

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">파트 *</Text>
              <View className="flex-row flex-wrap gap-2">
                {PARTS.map((p) => (
                  <TouchableOpacity key={p} onPress={() => setForm((f) => ({ ...f, part: p }))}
                    className={`px-3 py-1.5 rounded-full border ${form.part === p ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                    <Text className={`text-xs ${form.part === p ? 'text-white' : 'text-gray-600'}`}>{PART_LABELS[p]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 직책은 단원 추가 후 단장이 수정 시 변경 가능 — 기본값: 평단원 */}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
