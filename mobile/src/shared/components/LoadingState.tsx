import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { fontSize } from '../theme';

interface Props {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: Props) {
  const { T } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={T.primary} />
      <Text style={[styles.text, { color: T.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  text: { fontSize: fontSize.sm, marginTop: 8 },
});
