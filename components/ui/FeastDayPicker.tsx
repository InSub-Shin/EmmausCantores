import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';

interface Props {
  label?: string;
  value: string; // MM-DD
  onChange: (v: string) => void;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const getDays = (month: number) => {
  const counts: Record<number, number> = { 2: 29, 4: 30, 6: 30, 9: 30, 11: 30 };
  return Array.from({ length: counts[month] ?? 31 }, (_, i) => i + 1);
};

export function FeastDayPicker({ label, value, onChange }: Props) {
  const [show, setShow] = useState(false);
  const [tempMonth, setTempMonth] = useState(() => value ? parseInt(value.split('-')[0]) : 1);
  const [tempDay, setTempDay] = useState(() => value ? parseInt(value.split('-')[1]) : 1);

  const display = value
    ? `${parseInt(value.split('-')[0])}월 ${parseInt(value.split('-')[1])}일`
    : '월/일 선택';

  const handleOpen = () => {
    if (value) {
      setTempMonth(parseInt(value.split('-')[0]));
      setTempDay(parseInt(value.split('-')[1]));
    }
    setShow(true);
  };

  const handleConfirm = () => {
    const days = getDays(tempMonth);
    const safeDay = Math.min(tempDay, days.length);
    const m = String(tempMonth).padStart(2, '0');
    const d = String(safeDay).padStart(2, '0');
    onChange(`${m}-${d}`);
    setShow(false);
  };

  const days = getDays(tempMonth);

  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>}
      <TouchableOpacity
        onPress={handleOpen}
        className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between bg-white"
      >
        <Text className={value ? 'text-gray-900 text-base' : 'text-gray-400 text-base'}>{display}</Text>
        <Text>📅</Text>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl pb-8">
            {/* 헤더 */}
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text className="text-gray-500 text-base">취소</Text>
              </TouchableOpacity>
              <Text className="font-bold text-gray-900">축일 선택</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text className="text-indigo-600 font-semibold text-base">확인</Text>
              </TouchableOpacity>
            </View>

            {/* 선택된 값 표시 */}
            <View className="items-center py-3">
              <Text className="text-lg font-bold text-indigo-600">
                {tempMonth}월 {Math.min(tempDay, days.length)}일
              </Text>
            </View>

            {/* 월/일 컬럼 */}
            <View className="flex-row" style={{ height: 240 }}>
              {/* 월 */}
              <View className="flex-1 border-r border-gray-100">
                <Text className="text-center text-xs text-gray-400 py-2">월</Text>
                <FlatList
                  data={MONTHS}
                  keyExtractor={(m) => String(m)}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => { setTempMonth(item); setTempDay((d) => Math.min(d, getDays(item).length)); }}
                      className={`py-3 items-center ${item === tempMonth ? 'bg-indigo-50' : ''}`}
                    >
                      <Text className={`text-base ${item === tempMonth ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}>
                        {item}월
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* 일 */}
              <View className="flex-1">
                <Text className="text-center text-xs text-gray-400 py-2">일</Text>
                <FlatList
                  data={days}
                  keyExtractor={(d) => String(d)}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setTempDay(item)}
                      className={`py-3 items-center ${item === tempDay ? 'bg-indigo-50' : ''}`}
                    >
                      <Text className={`text-base ${item === tempDay ? 'text-indigo-600 font-bold' : 'text-gray-700'}`}>
                        {item}일
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
