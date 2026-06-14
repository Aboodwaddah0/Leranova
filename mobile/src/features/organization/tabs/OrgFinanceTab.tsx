import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import {
  DollarSign, TrendingUp, Users, CreditCard, BookOpen, Gift, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState } from '../../../shared/components';
import { fetchRevenue } from '../services/organizationService';
import type { OrgRevenue } from '../../../types/organization';

const fmtMoney = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const METHOD_LABEL: Record<string, string> = {
  CARD:         'Card',
  BANK_TRANSFER:'Transfer',
  CASH:         'Cash',
  ONLINE:       'Online',
};

const EMPTY_DATA: OrgRevenue = {
  totalRevenue:     0,
  totalPayments:    0,
  paidCoursesCount: 0,
  freeCoursesCount: 0,
  byCourse: [],
  recentPayments: [],
};

function PaymentMethodBadge({ method }: { method?: string | null }) {
  const { T } = useTheme();
  if (!method) return null;
  return (
    <View style={[styles.methodBadge, { backgroundColor: T.elevated }]}>
      <Text style={[styles.methodText, { color: T.muted }]}>{METHOD_LABEL[method] ?? method}</Text>
    </View>
  );
}

interface Props { orgType: 'SCHOOL' | 'ACADEMY'; }

export function OrgFinanceTab({ orgType }: Props) {
  const { T } = useTheme();

  const [revenue,      setRevenue]      = useState<OrgRevenue | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [showAllCourses, setShowAllCourses] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchRevenue();
      setRevenue(data);
    } catch {
      Alert.alert('Error', 'Failed to load finance data.');
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

  if (loading) return <LoadingState message="Loading finance data…" />;

  const data = revenue ?? EMPTY_DATA;

  const byCourse   = data.byCourse.filter(c => c.revenue > 0 || c.isPaid);
  const payments   = data.recentPayments;
  const topCourses = showAllCourses ? byCourse : byCourse.slice(0, 5);
  const maxRevenue = Math.max(...byCourse.map(c => c.revenue), 1);

  return (
    <ScrollView
      contentContainerStyle={[styles.body, { backgroundColor: T.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Stat cards ── */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardWide, { backgroundColor: '#6366f1' }]}>
          <View style={styles.statIconRow}>
            <View style={styles.statIconBg}>
              <DollarSign size={20} color="#fff" />
            </View>
            <Text style={styles.statLabelLight}>Total Revenue</Text>
          </View>
          <Text style={styles.statValueLarge}>${fmtMoney(data.totalRevenue)}</Text>
          <Text style={styles.statSub}>{data.totalPayments} payment{data.totalPayments !== 1 ? 's' : ''} received</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <Users size={18} color="#10b981" />
          </View>
          <Text style={[styles.statValue, { color: T.text }]}>{data.totalPayments}</Text>
          <Text style={[styles.statLabel, { color: T.muted }]}>Paid Enrollments</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
            <CreditCard size={18} color="#6366f1" />
          </View>
          <Text style={[styles.statValue, { color: T.text }]}>{data.paidCoursesCount}</Text>
          <Text style={[styles.statLabel, { color: T.muted }]}>Paid Courses</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
            <Gift size={18} color="#f59e0b" />
          </View>
          <Text style={[styles.statValue, { color: T.text }]}>{data.freeCoursesCount}</Text>
          <Text style={[styles.statLabel, { color: T.muted }]}>Free Courses</Text>
        </View>
      </View>

      {/* ── Avg revenue per paid course ── */}
      {data.paidCoursesCount > 0 && (
        <View style={[styles.highlightRow, { backgroundColor: T.surface, borderColor: T.border }]}>
          <TrendingUp size={16} color="#6366f1" />
          <Text style={[styles.highlightLabel, { color: T.muted }]}>Avg. per paid course</Text>
          <Text style={[styles.highlightValue, { color: '#6366f1' }]}>
            ${fmtMoney(data.totalRevenue / data.paidCoursesCount)}
          </Text>
        </View>
      )}

      {/* ── Revenue by Course ── */}
      {byCourse.length > 0 && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <BookOpen size={16} color="#6366f1" />
            <Text style={[styles.cardTitle, { color: T.text }]}>Revenue by Course</Text>
            <Text style={[styles.cardSub, { color: T.muted }]}>{byCourse.length} course{byCourse.length !== 1 ? 's' : ''}</Text>
          </View>

          {topCourses.map((c, idx) => {
            const pct = maxRevenue > 0 ? (c.revenue / maxRevenue) * 100 : 0;
            const barColor = idx === 0 ? '#6366f1' : idx === 1 ? '#8b5cf6' : idx === 2 ? '#a78bfa' : '#c4b5fd';
            return (
              <View key={c.courseId} style={styles.courseRow}>
                <View style={styles.courseInfo}>
                  <Text style={[styles.courseName, { color: T.text }]} numberOfLines={1}>{c.courseName}</Text>
                  <View style={styles.courseMetaRow}>
                    {c.isPaid ? (
                      <View style={[styles.paidBadge, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                        <Text style={[styles.paidText, { color: '#10b981' }]}>PAID · ${Number(c.price ?? 0).toFixed(0)}</Text>
                      </View>
                    ) : (
                      <View style={[styles.paidBadge, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                        <Text style={[styles.paidText, { color: '#f59e0b' }]}>FREE</Text>
                      </View>
                    )}
                    <Text style={[styles.coursePayments, { color: T.muted }]}>{c.payments} enrollment{c.payments !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                <View style={styles.courseBarWrap}>
                  <View style={[styles.courseBarBg, { backgroundColor: T.elevated }]}>
                    <View style={[styles.courseBarFill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.courseRevenue, { color: T.text }]}>${fmtMoney(c.revenue)}</Text>
                </View>
              </View>
            );
          })}

          {byCourse.length > 5 && (
            <TouchableOpacity
              style={[styles.showMoreBtn, { borderColor: T.border }]}
              onPress={() => setShowAllCourses(p => !p)}
            >
              {showAllCourses ? <ChevronUp size={14} color={T.muted} /> : <ChevronDown size={14} color={T.muted} />}
              <Text style={[styles.showMoreText, { color: T.muted }]}>
                {showAllCourses ? 'Show less' : `Show ${byCourse.length - 5} more`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Recent Payments ── */}
      {payments.length > 0 ? (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <CreditCard size={16} color="#6366f1" />
            <Text style={[styles.cardTitle, { color: T.text }]}>Recent Payments</Text>
            <Text style={[styles.cardSub, { color: T.muted }]}>Last {payments.length}</Text>
          </View>

          {payments.map((tx, i) => (
            <View
              key={tx.id}
              style={[styles.txRow, { borderTopColor: T.border }, i === 0 && styles.txRowFirst]}
            >
              <View style={[styles.txAvatar, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <DollarSign size={16} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txName, { color: T.text }]} numberOfLines={1}>
                  {tx.studentName ?? `Payment #${tx.id}`}
                </Text>
                {!!tx.courseName && (
                  <Text style={[styles.txSub, { color: T.muted }]} numberOfLines={1}>{tx.courseName}</Text>
                )}
                <View style={styles.txMeta}>
                  <Text style={[styles.txDate, { color: T.muted }]}>{tx.date || '—'}</Text>
                  <PaymentMethodBadge method={tx.paymentMethod} />
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: '#10b981' }]}>${fmtMoney(tx.amount)}</Text>
                {!!tx.status && (
                  <View style={[styles.txStatus, {
                    backgroundColor: tx.status === 'PAID' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                  }]}>
                    <Text style={{ color: tx.status === 'PAID' ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: '700' }}>
                      {tx.status}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <CreditCard size={16} color="#6366f1" />
            <Text style={[styles.cardTitle, { color: T.text }]}>Recent Payments</Text>
          </View>
          <Text style={[styles.emptyMsg, { color: T.muted }]}>No payments recorded yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body:           { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },

  // Stats
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard:       { flex: 1, minWidth: '42%', borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], alignItems: 'center', gap: spacing[2] },
  statCardWide:   { minWidth: '100%', borderWidth: 0 },
  statIconRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], width: '100%' },
  statIconBg:     { width: 32, height: 32, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  statLabelLight: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' },
  statValueLarge: { fontSize: 30, fontWeight: fontWeight.extrabold, color: '#fff', alignSelf: 'flex-start' },
  statSub:        { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-start' },
  statIcon:       { width: 40, height: 40, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  statValue:      { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  statLabel:      { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },

  // Highlight row
  highlightRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  highlightLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  highlightValue: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },

  // Cards
  card:           { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  cardTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardTitle:      { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, flex: 1 },
  cardSub:        { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  // Course rows
  courseRow:      { gap: spacing[2] },
  courseInfo:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courseName:     { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  courseMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  paidBadge:      { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  paidText:       { fontSize: 10, fontWeight: '800' },
  coursePayments: { fontSize: fontSize.xs },
  courseBarWrap:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  courseBarBg:    { flex: 1, height: 8, borderRadius: 999, overflow: 'hidden' },
  courseBarFill:  { height: '100%', borderRadius: 999 },
  courseRevenue:  { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold, minWidth: 72, textAlign: 'right' },

  showMoreBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingVertical: spacing[2], borderRadius: radius.lg, borderWidth: 1, marginTop: spacing[1] },
  showMoreText:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  // Transactions
  txRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: spacing[3], borderTopWidth: 1 },
  txRowFirst:     { borderTopWidth: 0, paddingTop: 0 },
  txAvatar:       { width: 38, height: 38, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  txName:         { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  txSub:          { fontSize: fontSize.xs, marginTop: 2 },
  txMeta:         { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: 2 },
  txDate:         { fontSize: fontSize.xs },
  txRight:        { alignItems: 'flex-end', gap: 4 },
  txAmount:       { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  txStatus:       { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  methodBadge:    { paddingHorizontal: spacing[2], paddingVertical: 1, borderRadius: 999 },
  methodText:     { fontSize: 10, fontWeight: '700' },
  emptyMsg:       { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing[4] },
});
