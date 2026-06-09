import '../global.css';
import { useEffect } from 'react';
import { Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';

export default function RootLayout() {
  const { setSession, setLoading, fetchProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // 저장된 refresh token이 무효한 경우(만료/폐기) → 세션 정리 후 로그인 화면
      if (error) {
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        registerForPushNotifications().then((token) => {
          if (token) savePushToken(session.user.id, token);
        });
      }
      setLoading(false);
    }).catch(async () => {
      await supabase.auth.signOut().catch(() => {});
      setSession(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 토큰 갱신 실패 등으로 세션이 사라지면 정리
      if (event === 'TOKEN_REFRESHED' && !session) {
        setSession(null);
        return;
      }
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {/* 키보드가 올라올 때 콘텐츠를 밀어올림 */}
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFillObject}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Stack screenOptions={{ headerShown: false }} />
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}
