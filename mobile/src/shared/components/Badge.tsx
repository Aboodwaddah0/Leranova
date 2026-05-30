import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { radius, spacing, fontSize, fontWeight } from '../theme';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'muted';

const colors: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  success: { bg: 'rgba(16,185,129,0.12)',  text: '#34d399' },
  warning: { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24' },
  danger:  { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  muted:   { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
};

interface Props {
  label:    string;
  variant?: Variant;
  style?:   ViewStyle;
}

export function Badge({ label, variant = 'primary', style }: Props) {
  const c = colors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical:   spacing[0.5],
    alignSelf: 'flex-start',
  },
  text: {
    fontSize:   fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
});
