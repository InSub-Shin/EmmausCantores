import { View, Text, Alert, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Input, getPasswordHint } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function filterKorean(text: string) {
  return text.replace(/[ㄱ-ㆎ가-힣ﾡ-ￜ]/g, '');
}

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!otp.trim()) {
      Alert.alert('입력 오류', '이메일로 받은 인증 코드를 입력해주세요.');
      return;
    }
    if (!password || !passwordConfirm) {
      Alert.alert('입력 오류', '새 비밀번호를 입력해주세요.');
      return;
    }
    if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      Alert.alert('비밀번호 오류', '비밀번호는 영문+숫자 조합 6자 이상으로 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('비밀번호 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      // 1. OTP 코드로 복구 세션 검증
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: (email ?? '').trim(),
        token: otp.trim(),
        type: 'recovery',
      });
      if (otpError) {
        Alert.alert('인증 실패', '인증 코드가 올바르지 않거나 만료되었습니다.\n다시 시도해주세요.');
        return;
      }

      // 2. 새 비밀번호로 변경
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        Alert.alert('오류', updateError.message);
        return;
      }

      Alert.alert('완료', '비밀번호가 변경되었습니다.\n새 비밀번호로 로그인됩니다.', [
        { text: '확인', onPress: () => router.replace('/(main)/home') },
      ]);
    } finally {
      setLoading(false);
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
            <Text className="text-3xl">🔑</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-1">비밀번호 재설정</Text>
          <Text className="text-gray-500 text-sm text-center">
            {email ? `${email}로` : '이메일로'} 보낸 인증 코드와{'\n'}새 비밀번호를 입력해주세요.
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-5 border border-gray-200 gap-1">
          <Input
            label="인증 코드 (6자리)"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ''))}
            placeholder="이메일로 받은 숫자 코드"
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="새 비밀번호"
            value={password}
            onChangeText={(t) => setPassword(filterKorean(t))}
            placeholder="영문+숫자 6자 이상"
            secureTextEntry
            showToggle
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            hint={getPasswordHint(password)?.message}
            hintValid={getPasswordHint(password)?.valid}
          />
          <Input
            label="비밀번호 확인"
            value={passwordConfirm}
            onChangeText={(t) => setPasswordConfirm(filterKorean(t))}
            placeholder="비밀번호 재입력"
            secureTextEntry
            showToggle
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleReset}
            hint={passwordConfirm ? (password === passwordConfirm ? '✓ 비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다') : undefined}
            hintValid={passwordConfirm ? password === passwordConfirm : undefined}
          />
          <View className="mt-2">
            <Button
              label={loading ? '변경 중...' : '비밀번호 변경'}
              onPress={handleReset}
              loading={loading}
            />
          </View>
        </View>

        <Text className="text-gray-400 text-xs text-center mt-4">
          코드를 못 받으셨나요? 스팸함을 확인하거나{'\n'}로그인 화면에서 다시 요청해주세요.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
