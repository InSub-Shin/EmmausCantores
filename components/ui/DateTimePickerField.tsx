import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface Props {
  label?: string;
  value: string;   // ISO string or ''
  onChange: (v: string) => void;
  placeholder?: string;
}

export function DateTimePickerField({ label, value, onChange, placeholder }: Props) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const toDate = () => (value ? new Date(value) : new Date());

  const display = () => {
    if (!value) return placeholder ?? '날짜/시간 선택';
    const d = new Date(value);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (!selected) return;
    setTempDate(selected);
    if (Platform.OS === 'android') setShowTime(true);
  };

  const handleTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTime(false);
    if (!selected) return;
    const base = tempDate ?? toDate();
    base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(base.toISOString());
  };

  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>}
      <TouchableOpacity
        onPress={() => setShowDate(true)}
        className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between bg-white"
      >
        <Text className={value ? 'text-gray-900 text-base' : 'text-gray-400 text-base'}>
          {display()}
        </Text>
        <Text>📅</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && showDate && (
        <DateTimePicker value={toDate()} mode="date" display="calendar" onChange={handleDateChange} />
      )}
      {Platform.OS === 'android' && showTime && (
        <DateTimePicker value={tempDate ?? toDate()} mode="time" display="clock" onChange={handleTimeChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showDate} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <View className="bg-white rounded-t-3xl px-4 pt-4 pb-8">
              <View className="flex-row justify-between mb-2">
                <TouchableOpacity onPress={() => setShowDate(false)}>
                  <Text className="text-gray-500 text-base">취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDate(false)}>
                  <Text className="text-indigo-600 font-semibold text-base">확인</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={toDate()}
                mode="datetime"
                display="spinner"
                onChange={(_, d) => { if (d) onChange(d.toISOString()); }}
                locale="ko-KR"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
