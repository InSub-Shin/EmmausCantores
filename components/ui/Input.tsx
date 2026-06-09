import { TextInput, Text, View, TextInputProps, TouchableOpacity } from 'react-native';
import { useState, forwardRef } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  phoneFormat?: boolean;
  showToggle?: boolean;  // 비밀번호 눈 토글 버튼 표시
  hint?: string;         // 입력칸 하단 안내 문구
  hintValid?: boolean;   // true=초록, false=빨강
}

/**
 * 핸드폰 번호에서 숫자만 추출
 * 예: "010-1234-5678" → "01012345678"
 */
export function extractPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * 숫자를 핸드폰 번호 형식으로 표시
 * 예: "01012345678" → "010-1234-5678"
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = extractPhoneNumber(phone);
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
}

/**
 * 비밀번호 유효성 검사 (영문+숫자 조합 6자 이상)
 * 입력값이 비어있으면 null 반환(힌트 미표시)
 */
export function getPasswordHint(pw: string): { valid: boolean; message: string } | null {
  if (!pw) return null;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const longEnough = pw.length >= 6;
  if (longEnough && hasLetter && hasNumber) {
    return { valid: true, message: '✓ 사용 가능한 비밀번호입니다' };
  }
  const missing: string[] = [];
  if (!longEnough) missing.push('6자 이상');
  if (!hasLetter) missing.push('영문');
  if (!hasNumber) missing.push('숫자');
  return { valid: false, message: `${missing.join(', ')} 필요` };
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, className, phoneFormat, showToggle, hint, hintValid, onChangeText, value, secureTextEntry, ...props },
  ref
) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);

  const handleChangeText = (text: string) => {
    if (phoneFormat) {
      const formatted = formatPhoneNumber(extractPhoneNumber(text));
      onChangeText?.(formatted);
    } else {
      onChangeText?.(text);
    }
  };

  const displayValue = phoneFormat ? formatPhoneNumber(value as string || '') : value;

  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>}
      <View className="relative">
        <TextInput
          ref={ref}
          className={`border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 text-base bg-white ${className ?? ''}`}
          style={{ color: '#111827', paddingRight: showToggle ? 48 : 16 }}
          placeholderTextColor="#9ca3af"
          value={displayValue as string}
          onChangeText={handleChangeText}
          keyboardType={phoneFormat ? 'phone-pad' : 'default'}
          secureTextEntry={showToggle ? secure : secureTextEntry}
          {...props}
        />
        {showToggle && (
          <TouchableOpacity
            onPress={() => setSecure((v) => !v)}
            style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', padding: 4 }}
          >
            <Text style={{ fontSize: 18, opacity: secure ? 0.25 : 1 }}>👁</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
      {!error && hint ? (
        <Text className={`text-xs mt-1 ${hintValid ? 'text-green-600' : 'text-red-500'}`}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
