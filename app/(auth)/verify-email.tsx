import { View, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function VerifyEmailScreen() {
  const { email, name } = useLocalSearchParams<{ email: string; name: string }>();
  const { fetchProfile } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.trim().length < 6) {
      Alert.alert('입력 오류', '이메일로 받은 6자리 인증 코드를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      // 1. OTP로 가입 인증 → 세션 생성
      const { data, error } = await supabase.auth.verifyOtp({
        email: (email ?? '').trim(),
        token: otp.trim(),
        type: 'signup',
      });
      if (error) {
        Alert.alert('인증 실패', '인증 코드가 올바르지 않거나 만료되었습니다.\n다시 시도해주세요.');
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        Alert.alert('오류', '인증에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      // 2. 세션이 생긴 뒤 프로필 생성
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', userId)
        .maybeSingle();
      if (existing) {
        await supabase.from('profiles').update({ name: (name ?? '').trim() }).eq('id', existing.id);
      } else {
        await supabase.from('profiles').insert({
          auth_id: userId,
          name: (name ?? '').trim(),
          role: 'member',
          is_executive: false,
          is_deleted: false,
        });
      }

      await fetchProfile(userId);
      router.replace('/(auth)/setup');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: (email ?? '').trim() });
    setResending(false);
    if (error) {
      Alert.alert('오류', error.message);
    } else {
      Alert.alert('재발송 완료', '인증 코드를 다시 보냈습니다.\n메일함(스팸함 포함)을 확인해주세요.');
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-8"
      >
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-indigo-100 rounded-2xl items-center justify-center mb-4">
            <Text className="text-3xl">✉️</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-1">이메일 인증</Text>
          <Text className="text-gray-500 text-sm text-center">
            {email ? `${email}로` : '이메일로'} 보낸{'\n'}6자리 인증 코드를 입력해주세요.
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-5 border border-gray-200 gap-1">
          <Input
            label="인증 코드 (6자리)"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ''))}
            placeholder="숫자 6자리"
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />
          <View className="mt-2">
            <Button
              label={loading ? '인증 중...' : '인증하고 시작하기'}
              onPress={handleVerify}
              loading={loading}
            />
          </View>
        </View>

        <TouchableOpacity onPress={handleResend} disabled={resending} className="items-center py-3 mt-2">
          <Text className="text-indigo-500 text-sm">
            {resending ? '재발송 중...' : '인증 코드 다시 받기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} className="items-center py-1">
          <Text className="text-gray-400 text-xs">로그인 화면으로 돌아가기</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
