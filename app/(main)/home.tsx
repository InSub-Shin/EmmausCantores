import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui/Card';
import { PART_LABELS, ROLE_LABELS } from '@/types';

export default function HomeScreen() {
  const { profile, signOut } = useAuthStore();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return '좋은 아침이에요';
    if (h < 18) return '좋은 오후예요';
    return '좋은 저녁이에요';
  })();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* 헤더 */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-gray-500 text-sm">{greeting} 👋</Text>
            <Text className="text-2xl font-bold text-gray-900">
              {profile?.name ?? '단원'}님
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(main)/profile')}
            className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center"
          >
            <Text className="text-xl">👤</Text>
          </TouchableOpacity>
        </View>

        {/* 내 정보 카드 */}
        {profile && (
          <Card className="mb-4 bg-indigo-600">
            <Text className="text-indigo-200 text-xs mb-1">나의 정보</Text>
            <Text className="text-white text-xl font-bold mb-1">{profile.name}</Text>
            <View className="flex-row gap-2">
              {profile.part && (
                <View className="bg-indigo-500 rounded-full px-3 py-1">
                  <Text className="text-white text-xs">{PART_LABELS[profile.part]}</Text>
                </View>
              )}
              <View className="bg-indigo-500 rounded-full px-3 py-1">
                <Text className="text-white text-xs">{ROLE_LABELS[profile.role]}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* 바로가기 메뉴 */}
        <Text className="text-lg font-bold text-gray-800 mb-3">바로가기</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {[
            { icon: '👥', label: '단원 목록', href: '/(main)/members' as const },
            { icon: '🗳️', label: '투표', href: '/(main)/votes' as const },
            { icon: '📅', label: '일정', href: '/(main)/schedule' as const },
            { icon: '🎵', label: '특송 정보', href: '/(main)/songs' as const },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.href)}
              className="bg-white rounded-2xl p-4 items-center border border-gray-100 shadow-sm"
              style={{ width: '47%' }}
            >
              <Text className="text-3xl mb-2">{item.icon}</Text>
              <Text className="text-gray-700 font-medium text-sm">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login');
          }}
          className="items-center py-3"
        >
          <Text className="text-gray-400 text-sm">로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
