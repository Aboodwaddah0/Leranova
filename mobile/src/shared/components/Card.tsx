import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { radius, shadow, spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  noBorder?: boolean;
}

export function Card({ children, style, padding = spacing[4], noBorder = false }: Props) {
  const { T } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: T.cardBg,
          borderColor:     T.cardBorder,
          borderWidth:     noBorder ? 0 : 1,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    ...shadow.sm,
  },
});
