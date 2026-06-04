import '../global.css';
import { useEffect } from 'react';
import { Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';

export default function RootLayout() {
  const { setSession, setLoading, fetchProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        registerForPushNotifications().then((token) => {
          if (token) savePushToken(session.user.id, token);
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/(auth)/reset-password');
      }
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
