import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const base = 'flex-row items-center justify-center rounded-xl';

  const sizeClass = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  }[size];

  const variantClass = {
    primary: 'bg-indigo-600 active:bg-indigo-700',
    secondary: 'bg-indigo-100 active:bg-indigo-200',
    outline: 'border border-indigo-600',
    ghost: '',
  }[variant];

  const textClass = {
    primary: 'text-white font-semibold',
    secondary: 'text-indigo-700 font-semibold',
    outline: 'text-indigo-600 font-semibold',
    ghost: 'text-indigo-600 font-semibold',
  }[variant];

  const textSize = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }[size];

  return (
    <TouchableOpacity
      className={`${base} ${sizeClass} ${variantClass} ${disabled || loading ? 'opacity-50' : ''} ${className ?? ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#4f46e5'} className="mr-2" />}
      <Text className={`${textClass} ${textSize}`}>{label}</Text>
    </TouchableOpacity>
  );
}
