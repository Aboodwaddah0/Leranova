import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import { fetchRevenue } from '../services/organizationService';
import type { OrgRevenue } from '../../../types/organization';

interface Props { orgType: 'SCHOOL' | 'ACADEMY'; }

export function OrgFinanceTab({ orgType }: Props) {
  const { T } = useTheme();

  const [revenue,    setRevenue]    = useState<OrgRevenue | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchRevenue();
      setRevenue(data);
    } catch {
      Alert.alert('Error', 'Failed to load revenue data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const fmtMoney = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <LoadingState message="Loading finance data…" />;
  if (!revenue) return <EmptyState emoji="💰" title="No finance data" subtitle="Revenue information will appear here." />;

  const monthly = revenue.monthly ?? [];
  const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1);

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Stat cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
            <DollarSign size={22} color="#6366f1" />
          </View>
          <Text style={[styles.statValue, { color: T.text }]}>${fmtMoney(revenue.totalRevenue)}</Text>
          <Text style={[styles.statLabel, { color: T.muted }]}>Total Revenue</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <Users size={22} color="#10b981" />
          </View>
          <Text style={[styles.statValue, { color: T.text }]}>{revenue.totalEnrollments}</Text>
          <Text style={[styles.statLabel, { color: T.muted }]}>Total Enrollments</Text>
        </View>

        {revenue.paidEnrollments !== undefined && (
          <View style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <CreditCard size={22} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, { color: T.text }]}>{revenue.paidEnrollments}</Text>
            <Text style={[styles.statLabel, { color: T.muted }]}>Paid Enrollments</Text>
          </View>
        )}
      </View>

      {/* Monthly chart (bar chart) */}
      {monthly.length > 0 && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <TrendingUp size={16} color="#6366f1" />
            <Text style={[styles.cardTitle, { color: T.text }]}>Monthly Revenue</Text>
          </View>
          <View style={styles.barChart}>
            {monthly.map(({ month, revenue: rev }) => {
              const barH = (rev / maxRevenue) * 120;
              return (
                <View key={month} style={styles.barCol}>
                  <Text style={[styles.barRevLabel, { color: T.muted }]}>${(rev / 1000).toFixed(1)}k</Text>
                  <View style={[styles.bar, { height: barH, backgroundColor: '#6366f1' }]} />
                  <Text style={[styles.barMonthLabel, { color: T.muted }]}>{String(month).slice(5, 7)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Recent transactions */}
      {(revenue.recentTransactions ?? []).length > 0 && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <CreditCard size={16} color="#6366f1" />
            <Text style={[styles.cardTitle, { color: T.text }]}>Recent Transactions</Text>
          </View>
          {revenue.recentTransactions!.map(tx => (
            <View key={tx.id} style={[styles.txRow, { borderTopColor: T.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txName, { color: T.text }]}>{tx.studentName ?? `Transaction #${tx.id}`}</Text>
                {!!tx.courseName && <Text style={[styles.txSub, { color: T.muted }]}>{tx.courseName}</Text>}
                <Text style={[styles.txDate, { color: T.muted }]}>{String(tx.date).slice(0, 10)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.txAmount, { color: '#10b981' }]}>${fmtMoney(tx.amount)}</Text>
                {!!tx.status && (
                  <View style={[styles.txStatus, { backgroundColor: tx.status === 'PAID' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                    <Text style={{ color: tx.status === 'PAID' ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: '700' }}>{tx.status}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body:          { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard:      { flex: 1, minWidth: '42%', borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], alignItems: 'center', gap: spacing[2] },
  statIcon:      { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  statValue:     { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  statLabel:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  card:          { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  cardTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardTitle:     { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  barChart:      { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], height: 150, paddingTop: spacing[3] },
  barCol:        { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar:           { width: '60%', borderRadius: 4, minHeight: 4 },
  barRevLabel:   { fontSize: 9, fontWeight: '600' },
  barMonthLabel: { fontSize: 9, fontWeight: '600' },
  txRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: spacing[3], borderTopWidth: 1 },
  txName:        { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  txSub:         { fontSize: fontSize.xs, marginTop: 1 },
  txDate:        { fontSize: fontSize.xs, marginTop: 1 },
  txAmount:      { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  txStatus:      { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999, marginTop: 4 },
});
