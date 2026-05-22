import { View, Text, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { signInWithKakao } from '@/lib/kakao';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Profile } from '@/types';

const DEV_MOCK_PROFILE: Profile = {
  id: 'dev-test-user',
  auth_id: null,
  name: '테스트 단원',
  baptismal_name: '베드로',
  phone: '010-0000-0000',
  birthday: '1990-01-01',
  feast_day: '06-29',
  part: 'tenor',
  role: 'leader',
  is_executive: true,
  is_deleted: false,
  profile_image: null,
  push_token: null,
  created_at: new Date().toISOString(),
};

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setProfile } = useAuthStore();

  async function handleKakaoLogin() {
    setLoading(true);
    try {
      await signInWithKakao();
    } catch (e) {
      Alert.alert('로그인 오류', '카카오 로그인 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setEmailLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      Alert.alert('로그인 실패', error.message);
    } else {
      router.replace('/(main)/home');
    }
    setEmailLoading(false);
  }

  function handleDevLogin() {
    setProfile(DEV_MOCK_PROFILE);
    router.replace('/(main)/home');
  }

  return (
    <View className="flex-1 bg-indigo-50 items-center justify-center px-8">
      <View className="items-center mb-12">
        <View className="w-24 h-24 bg-indigo-600 rounded-3xl items-center justify-center mb-6 shadow-lg">
          <Text className="text-white text-4xl">♪</Text>
        </View>
        <Text className="text-3xl font-bold text-indigo-900 mb-2">엠마우스 깐또레스</Text>
        <Text className="text-gray-500 text-base text-center">
          성가대 전용 앱에 오신 것을 환영합니다
        </Text>
      </View>

      <View className="w-full gap-3">
        <TouchableOpacity
          onPress={handleKakaoLogin}
          disabled={loading}
          className="w-full py-4 rounded-xl items-center justify-center"
          style={{ backgroundColor: '#FEE500', opacity: loading ? 0.6 : 1 }}
        >
          <Text className="text-gray-900 font-bold text-base">
            {loading ? '로그인 중...' : '카카오로 시작하기'}
          </Text>
        </TouchableOpacity>

        {/* 이메일 로그인 (개발/테스트용) */}
        <TouchableOpacity
          onPress={() => setShowEmailLogin((v) => !v)}
          className="items-center py-2"
        >
          <Text className="text-indigo-400 text-sm">
            {showEmailLogin ? '▲ 이메일 로그인 닫기' : '✉️ 이메일로 로그인'}
          </Text>
        </TouchableOpacity>

        {showEmailLogin && (
          <View className="bg-white rounded-2xl p-4 border border-gray-200 gap-2">
            <Input
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="test@example.com"
              keyboardType="email-address"
            />
            <Input
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
            />
            <Button
              label={emailLoading ? '로그인 중...' : '이메일로 로그인'}
              onPress={handleEmailLogin}
              loading={emailLoading}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={handleDevLogin}
          className="w-full py-3 rounded-xl items-center border border-gray-300 bg-white"
        >
          <Text className="text-gray-500 text-sm">🧪 테스트 모드로 시작 (DB 미연결)</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-xs text-gray-400 mt-8 text-center">
        로그인 시 앱의 이용약관 및 개인정보처리방침에{'\n'}동의하는 것으로 간주됩니다.
      </Text>
    </View>
  );
}
