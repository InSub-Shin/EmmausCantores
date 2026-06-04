import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoCrypto from 'expo-crypto';

// React Native에는 WebCrypto API가 없어서 Supabase가 경고를 출력함.
// expo-crypto로 global.crypto를 폴리필하여 경고를 억제함.
if (typeof global.crypto === 'undefined' || typeof global.crypto.subtle === 'undefined') {
  (global as any).crypto = {
    getRandomValues: (array: Uint8Array) => ExpoCrypto.getRandomValues(array),
    randomUUID: () => ExpoCrypto.randomUUID(),
    subtle: {
      digest: async (algorithm: string, data: ArrayBuffer) => {
        const name = typeof algorithm === 'string' ? algorithm : (algorithm as any).name;
        const normalized = name.replace('-', '') as ExpoCrypto.CryptoDigestAlgorithm;
        return ExpoCrypto.digest(normalized, data);
      },
    },
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
