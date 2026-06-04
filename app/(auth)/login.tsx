import { View, Text, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, TextInput, Modal } from 'react-native';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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

type Mode = 'login' | 'signup';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function filterKorean(text: string) {
  return text.replace(/[ㄱ-ㆎ가-힣ﾡ-ￜ]/g, '');
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { setProfile, fetchProfile } = useAuthStore();

  // refs for keyboard next navigation
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmRef = useRef<TextInput>(null);

  const reset = (next: Mode) => {
    setName(''); setEmail(''); setPassword(''); setPasswordConfirm('');
    setMode(next);
  };

  // ── 이메일 유효성 ──────────────────────────────────────────────────────────

  function validateEmail(value: string) {
    return EMAIL_REGEX.test(value.trim());
  }

  // ── 로그인 ─────────────────────────────────────────────────────────────────

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('이메일 오류', '올바른 이메일 형식을 입력해주세요.\n예) example@email.com');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      if (error.message.includes('Email not confirmed')) {
        Alert.alert('이메일 인증 필요', '가입 시 발송된 이메일에서 인증 링크를 클릭해주세요.');
      } else if (error.message.includes('Invalid login credentials')) {
        Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        Alert.alert('로그인 실패', error.message);
      }
      return;
    }
    await fetchProfile(data.user!.id);
    await navigateAfterAuth(data.user!.id);
    setLoading(false);
  }

  // ── 회원가입 ───────────────────────────────────────────────────────────────

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('입력 오류', '이름, 이메일, 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('이메일 오류', '올바른 이메일 형식을 입력해주세요.\n예) example@email.com');
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
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('계정 생성에 실패했습니다.');

      // 이미 존재하는 프로필이면 name만 업데이트, 없으면 새로 생성
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', userId)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ name: name.trim() })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('profiles').insert({
          auth_id: userId,
          name: name.trim(),
          role: 'member',
          is_executive: false,
          is_deleted: false,
        });
        if (insertError) throw insertError;
      }

      if (data.session) {
        await fetchProfile(userId);
        router.replace('/(auth)/setup');
      } else {
        Alert.alert(
          '가입 완료 🎉',
          `${email.trim()}로 인증 메일을 보냈습니다.\n메일함에서 인증 링크를 클릭하면 로그인할 수 있습니다.`,
          [{ text: '확인', onPress: () => reset('login') }]
        );
      }
    } catch (e: any) {
      if (e.message?.includes('already registered') || e.message?.includes('already been registered')) {
        Alert.alert('가입 실패', '이미 사용 중인 이메일입니다.');
      } else {
        Alert.alert('가입 실패', e.message ?? '회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }

  // 프로필 완성 여부 확인 후 라우팅
  async function navigateAfterAuth(userId: string) {
    const { data } = await supabase.from('profiles').select('part').eq('auth_id', userId).single();
    if (!data?.part) {
      router.replace('/(auth)/setup');
    } else {
      router.replace('/(main)/home');
    }
  }

  // ── 비밀번호 찾기 ───────────────────────────────────────────────────────────

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return;
    }
    if (!EMAIL_REGEX.test(forgotEmail.trim())) {
      Alert.alert('이메일 오류', '올바른 이메일 형식을 입력해주세요.');
      return;
    }
    setForgotLoading(true);
    const redirectTo = Linking.createURL('reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo });
    setForgotLoading(false);
    if (error) {
      Alert.alert('오류', error.message);
      return;
    }
    setShowForgot(false);
    setForgotEmail('');
    Alert.alert(
      '메일 발송 완료',
      `${forgotEmail.trim()}로 비밀번호 재설정 링크를 보냈습니다.\n메일함을 확인해주세요.`
    );
  }

  const handleSubmit = mode === 'login' ? handleLogin : handleSignup;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-indigo-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고 */}
        <View className="items-center mb-10">
          <View className="w-24 h-24 bg-indigo-600 rounded-3xl items-center justify-center mb-6 shadow-lg">
            <Text className="text-white text-4xl">♪</Text>
          </View>
          <Text className="text-3xl font-bold text-indigo-900 mb-2">엠마우스 깐또레스</Text>
          <Text className="text-gray-500 text-base text-center">성가대 전용 앱에 오신 것을 환영합니다</Text>
        </View>

        {/* 탭 */}
        <View className="flex-row bg-white rounded-2xl p-1 mb-6 border border-gray-200">
          {(['login', 'signup'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => reset(m)}
              className={`flex-1 py-2.5 rounded-xl items-center ${mode === m ? 'bg-indigo-500' : ''}`}
            >
              <Text className={`font-semibold text-sm ${mode === m ? 'text-white' : 'text-gray-400'}`}>
                {m === 'login' ? '로그인' : '회원가입'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 폼 */}
        <View className="bg-white rounded-2xl p-5 border border-gray-200 gap-1">
          {mode === 'signup' && (
            <Input
              label="이름"
              value={name}
              onChangeText={setName}
              placeholder="홍길동"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
          )}
          <Input
            ref={emailRef}
            label="이메일"
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <Input
            ref={passwordRef}
            label="비밀번호"
            value={password}
            onChangeText={(t) => setPassword(filterKorean(t))}
            placeholder={mode === 'signup' ? '영문+숫자 6자 이상' : '비밀번호'}
            secureTextEntry
            showToggle
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType={mode === 'signup' ? 'next' : 'done'}
            onSubmitEditing={mode === 'signup'
              ? () => passwordConfirmRef.current?.focus()
              : handleSubmit
            }
            blurOnSubmit={mode !== 'signup'}
          />
          {mode === 'signup' && (
            <Input
              ref={passwordConfirmRef}
              label="비밀번호 확인"
              value={passwordConfirm}
              onChangeText={(t) => setPasswordConfirm(filterKorean(t))}
              placeholder="비밀번호 재입력"
              secureTextEntry
              showToggle
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          )}
          <View className="mt-2">
            <Button
              label={loading
                ? (mode === 'login' ? '로그인 중...' : '가입 중...')
                : (mode === 'login' ? '로그인' : '회원가입')}
              onPress={handleSubmit}
              loading={loading}
            />
          </View>
        </View>

        {/* 비밀번호 찾기 */}
        {mode === 'login' && (
          <TouchableOpacity
            onPress={() => { setForgotEmail(email); setShowForgot(true); }}
            className="items-center py-2 mt-1"
          >
            <Text className="text-indigo-400 text-sm">비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>
        )}

        {/* 테스트 모드 */}
        <TouchableOpacity
          onPress={() => { setProfile(DEV_MOCK_PROFILE); router.replace('/(main)/home'); }}
          className="mt-4 items-center py-3"
        >
          <Text className="text-gray-400 text-xs">🧪 테스트 모드 (DB 미연결)</Text>
        </TouchableOpacity>

        <Text className="text-xs text-gray-400 mt-4 text-center">
          로그인 시 앱의 이용약관 및 개인정보처리방침에{'\n'}동의하는 것으로 간주됩니다.
        </Text>
      </ScrollView>

      {/* 비밀번호 찾기 모달 */}
      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={() => setShowForgot(false)}>
        <View className="flex-1 justify-center items-center bg-black/40 px-8">
          <View className="bg-white rounded-2xl p-6 w-full">
            <Text className="text-lg font-bold text-gray-900 mb-1">비밀번호 찾기</Text>
            <Text className="text-gray-500 text-sm mb-4">
              가입한 이메일을 입력하면 재설정 링크를 보내드립니다.
            </Text>
            <Input
              label="이메일"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleForgotPassword}
            />
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => { setShowForgot(false); setForgotEmail(''); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 items-center"
              >
                <Text className="text-gray-500 font-medium">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={forgotLoading}
                className="flex-1 py-3 rounded-xl bg-indigo-500 items-center"
              >
                <Text className="text-white font-semibold">
                  {forgotLoading ? '전송 중...' : '링크 전송'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
