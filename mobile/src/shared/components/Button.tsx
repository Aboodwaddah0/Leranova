import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius, fontSize, fontWeight } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  disabled?:  boolean;
  style?:     ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const gradients: Record<Variant, string[]> = {
  primary:   ['#6366f1', '#4f46e5'],
  secondary: ['#374151', '#1f2937'],
  danger:    ['#ef4444', '#dc2626'],
  ghost:     ['transparent', 'transparent'],
};

const heights: Record<Size, number> = { sm: 38, md: 48, lg: 56 };

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle, fullWidth = false,
}: Props) {
  const isDisabled = disabled || loading;
  const height = heights[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[fullWidth && styles.full, isDisabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={gradients[variant] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.base, { height }, variant === 'ghost' && styles.ghostBorder]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.label, textStyle]}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  full: { width: '100%' },
  disabled: { opacity: 0.5 },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    paddingHorizontal: spacing[6],
  },
  ghostBorder: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.5)',
  },
  label: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
});
