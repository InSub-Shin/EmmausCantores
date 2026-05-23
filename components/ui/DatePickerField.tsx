import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  label?: string;
  value: string;        // 'date' 모드: YYYY-MM-DD  /  'feastday' 모드: MM-DD
  onChange: (v: string) => void;
  mode?: 'date' | 'feastday';
  placeholder?: string;
  defaultValue?: string; // 값이 없을 때 피커 기본 날짜
}

export function DatePickerField({ label, value, onChange, mode = 'date', placeholder, defaultValue }: Props) {
  const [show, setShow] = useState(false);

  const toDate = () => {
    const base = value || defaultValue;
    if (!base) return new Date();
    if (mode === 'feastday') return new Date(`2000-${base}`);
    return new Date(base);
  };

  const display = () => {
    if (!value) return placeholder ?? '날짜 선택';
    if (mode === 'feastday') {
      const [m, d] = value.split('-');
      return `${parseInt(m)}월 ${parseInt(d)}일`;
    }
    const [y, m, d] = value.split('-');
    return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
  };

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (!selected) return;
    if (mode === 'feastday') {
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      onChange(`${m}-${d}`);
    } else {
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>}
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between bg-white"
      >
        <Text className={value ? 'text-gray-900 text-base' : 'text-gray-400 text-base'}>
          {display()}
        </Text>
        <Text>📅</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={toDate()}
          mode="date"
          display="calendar"
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl px-4 pt-4 pb-8">
              <View className="flex-row justify-between mb-2">
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text className="text-gray-500 text-base">취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text className="text-indigo-600 font-semibold text-base">확인</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={toDate()}
                mode="date"
                display="spinner"
                onChange={handleChange}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
