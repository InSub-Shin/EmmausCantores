import '../global.css';
import { useEffect } from 'react';
import { Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { exchangeCode } from '@/lib/kakao';

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
    });

    const handleDeepLink = async ({ url }: { url: string }) => {
      if (url.includes('auth/callback')) {
        try { await exchangeCode(url); } catch (e) { console.warn('Auth callback error:', e); }
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleDeepLink({ url }); });
    const linkSub = Linking.addEventListener('url', handleDeepLink);

    return () => { subscription.unsubscribe(); linkSub.remove(); };
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
