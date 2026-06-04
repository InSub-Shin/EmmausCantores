import { View, Text } from 'react-native';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  mode?: 'date' | 'feastday';
  placeholder?: string;
  defaultValue?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 16,
  color: '#111827',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export function DatePickerField({ label, value, onChange, mode = 'date' }: Props) {
  if (mode === 'feastday') {
    // MM-DD → select month/day
    const [mm, dd] = value ? value.split('-') : ['', ''];

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const getDays = (m: number) => {
      const counts: Record<number, number> = { 2: 29, 4: 30, 6: 30, 9: 30, 11: 30 };
      return Array.from({ length: counts[m] ?? 31 }, (_, i) => i + 1);
    };
    const selectedMonth = mm ? parseInt(mm) : 1;
    const days = getDays(selectedMonth);

    const update = (newMm: string, newDd: string) => {
      const m = newMm.padStart(2, '0');
      const d = newDd.padStart(2, '0');
      onChange(`${m}-${d}`);
    };

    return (
      <View style={{ marginBottom: 16 }}>
        {label && <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>{label}</Text>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <select
            value={mm || '01'}
            onChange={(e) => update(e.target.value, dd || '01')}
            style={{ ...inputStyle, flex: 1 }}
          >
            {months.map((m) => (
              <option key={m} value={String(m).padStart(2, '0')}>{m}월</option>
            ))}
          </select>
          <select
            value={dd || '01'}
            onChange={(e) => update(mm || '01', e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            {days.map((d) => (
              <option key={d} value={String(d).padStart(2, '0')}>{d}일</option>
            ))}
          </select>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>{label}</Text>}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </View>
  );
}
