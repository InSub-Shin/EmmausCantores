import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// 웹에서는 maybeCompleteAuthSession 호출 필요 없음
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export async function signInWithKakao() {
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS === 'web' ? false : true,
      scopes: 'profile_nickname profile_image',
      queryParams: {
        prompt: 'login', // 매번 카카오 계정 선택 화면 강제 표시
      },
    },
  });

  if (error || !data.url) throw error ?? new Error('카카오 로그인 URL을 가져오지 못했습니다.');

  // 웹 환경: 자동으로 리다이렉트 처리됨
  if (Platform.OS === 'web') {
    window.location.href = data.url;
    return;
  }

  // 모바일: Custom Tab 으로 열기 — 카카오톡 앱으로 이동 시 dismissed 될 수 있음
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  // 브라우저에서 바로 완료된 경우 (웹 로그인)
  if (result.type === 'success') {
    await exchangeCode(result.url);
  }
  // 카카오톡 앱을 통한 경우: _layout.tsx의 Linking 리스너가 처리
}

export async function exchangeCode(url: string) {
  const parsed = new URL(url);

  const code = parsed.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  // implicit flow 폴백
  const params = new URLSearchParams(parsed.hash.substring(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' });
  }
}
