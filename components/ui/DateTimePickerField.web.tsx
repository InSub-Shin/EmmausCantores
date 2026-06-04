import { View, Text } from 'react-native';

interface Props {
  label?: string;
  value: string;   // ISO string or ''
  onChange: (v: string) => void;
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

// ISO string ↔ datetime-local input value (YYYY-MM-DDTHH:mm)
function toInputValue(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimePickerField({ label, value, onChange }: Props) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>{label}</Text>}
      <input
        type="datetime-local"
        value={toInputValue(value)}
        onChange={(e) => {
          if (e.target.value) onChange(new Date(e.target.value).toISOString());
          else onChange('');
        }}
        style={inputStyle}
      />
    </View>
  );
}
