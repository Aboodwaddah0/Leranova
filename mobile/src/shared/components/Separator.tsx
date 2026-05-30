import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props {
  marginV?: number;
}

export function Separator({ marginV = 0 }: Props) {
  const { T } = useTheme();
  return <View style={[styles.line, { backgroundColor: T.separator, marginVertical: marginV }]} />;
}

const styles = StyleSheet.create({
  line: { height: 1, width: '100%' },
});
