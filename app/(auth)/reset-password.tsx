import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function filterKorean(text: string) {
  return text.replace(/[ㄱ-ㆎ가-힣ﾡ-ￜ]/g, '');
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
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
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Alert.alert('오류', error.message);
      return;
    }
    Alert.alert('완료', '비밀번호가 변경되었습니다.', [
      { text: '확인', onPress: () => router.replace('/(main)/home') },
    ]);
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
          <Text className="text-2xl font-bold text-gray-900 mb-1">새 비밀번호 설정</Text>
          <Text className="text-gray-500 text-sm text-center">영문+숫자 조합 6자 이상으로 입력해주세요.</Text>
        </View>

        <View className="bg-white rounded-2xl p-5 border border-gray-200 gap-1">
          <Input
            label="새 비밀번호"
            value={password}
            onChangeText={(t) => setPassword(filterKorean(t))}
            placeholder="영문+숫자 4자 이상"
            secureTextEntry
            showToggle
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
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
          />
          <View className="mt-2">
            <Button
              label={loading ? '변경 중...' : '비밀번호 변경'}
              onPress={handleReset}
              loading={loading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
