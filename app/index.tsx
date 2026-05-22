import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const { session, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // 실제 세션 또는 테스트 모드 프로필이 있으면 메인으로
  return session || profile ? <Redirect href="/(main)/home" /> : <Redirect href="/(auth)/login" />;
}
