import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fontWeight } from '../theme';

interface Props {
  name?: string | null;
  uri?:  string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, uri, size = 44, style }: Props) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initial = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0]?.toUpperCase() ?? '?');
  const fontSize = Math.max(12, Math.round(size * 0.4));

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style as StyleProp<ImageStyle>]}
        resizeMode="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={['#6366f1', '#8b5cf6']}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  initial: { color: '#fff', fontWeight: fontWeight.bold },
});
