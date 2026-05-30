import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { fontSize, fontWeight, spacing, radius } from '../theme';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: Props) {
  const { T } = useTheme();
  return (
    <View style={styles.container}>
      <AlertTriangle size={40} color={T.danger} />
      <Text style={[styles.message, { color: T.subtext }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={[styles.btn, { borderColor: T.primary }]} activeOpacity={0.8}>
          <Text style={[styles.btnText, { color: T.primary }]}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[8] },
  message:   { fontSize: fontSize.base, textAlign: 'center', lineHeight: 22 },
  btn: {
    marginTop: spacing[2],
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
  },
  btnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
