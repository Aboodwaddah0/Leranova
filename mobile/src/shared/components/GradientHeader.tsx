import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, radius, fontSize, fontWeight } from '../theme';

interface StatItem {
  label: string;
  value: string | number;
}

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  stats?: StatItem[];
  badge?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function GradientHeader({ title, subtitle, onBack, stats, badge, children, style }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#5b21b6', '#0f172a', '#312e81']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + spacing[3] }, style]}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : <View style={styles.placeholder} />}

        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {children}

      {/* Stats strip */}
      {stats && stats.length > 0 && (
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
    borderBottomLeftRadius:  radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  backText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  placeholder: { width: 70 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  badgeText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  title: {
    color: '#fff',
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold,
    marginBottom: spacing[1],
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: fontSize.sm,
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
    padding: spacing[3],
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
