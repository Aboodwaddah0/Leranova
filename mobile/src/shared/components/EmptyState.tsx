import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { fontSize, fontWeight, spacing } from '../theme';

interface Props {
  emoji?: string;
  title:  string;
  subtitle?: string;
}

export function EmptyState({ emoji = '📭', title, subtitle }: Props) {
  const { T } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: T.subtext }]}>{title}</Text>
      {subtitle && <Text style={[styles.sub, { color: T.muted }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[2] },
  emoji:     { fontSize: 48, marginBottom: spacing[2] },
  title:     { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center' },
  sub:       { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
