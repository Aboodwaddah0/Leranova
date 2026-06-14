import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Image, Linking, Alert, AppState,
  AppStateStatus,
} from 'react-native';
import { BookOpen, ChevronRight, Lock, CreditCard, Eye, BadgeCheck, CheckCircle } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { GradientHeader, Card, LoadingState, ErrorState, EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import {
  fetchAcademyTrackSubjects,
  fetchCourseSubjects,
  fetchStudentContext,
  subscribeAcademyMaterial,
  verifyAcademyCheckoutSession,
} from '../../student/services/studentService';
import type { AcademySubject, Subject } from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

type Route = RouteProp<StudentStackParamList, 'CourseDetails'>;
type Nav   = NativeStackNavigationProp<StudentStackParamList>;

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';

export function CourseDetailsScreen() {
  const { T }      = useTheme();
  const nav        = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [subjects,      setSubjects]      = useState<AcademySubject[]>([]);
  const [trackName,     setTrackName]     = useState(params.courseName);
  const [isAcademy,     setIsAcademy]     = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [refreshing,    setRefreshing]    = useState(false);
  const [subscribingId, setSubscribingId] = useState<number | null>(null);
  const [verifyingId,   setVerifyingId]   = useState<number | null>(null);

  // Pending Stripe session — stored so we can verify when user returns from browser
  const pendingSessionRef = useRef<{ sessionId: string; subjectId: number } | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const context = await fetchStudentContext();
      const academy = context?.mode === 'ACADEMY';
      setIsAcademy(academy);

      if (academy) {
        const data = await fetchAcademyTrackSubjects(params.courseId);
        if (data.track?.name) setTrackName(data.track.name);
        setSubjects(data.subjects ?? []);
      } else {
        const raw = await fetchCourseSubjects(params.courseId);
        const normalised: AcademySubject[] = raw.map((s: Subject) => ({
          id: s.id,
          name: s.name,
          trackId: params.courseId,
          description: s.description,
          imageUrl: null,
          isPaid: false,
          price: 0,
          isSubscribed: true,
          lessonCount: 0,
          level: null,
          teacher: s.teacher ? { id: null, name: s.teacher.name } : null,
        }));
        setSubjects(normalised);
      }
    } catch {
      setError('Failed to load subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params.courseId]);

  useEffect(() => { load(); }, [load]);

  // ── Verify pending Stripe session when app returns to foreground ──────────────
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      const pending = pendingSessionRef.current;
      if (!pending) return;

      // Clear immediately so we don't retry on every foreground event
      pendingSessionRef.current = null;

      setVerifyingId(pending.subjectId);
      try {
        const result = await verifyAcademyCheckoutSession(pending.sessionId);
        if (result?.verified) {
          Alert.alert(
            '✅ Subscription confirmed!',
            result.subjectName
              ? `You now have full access to "${result.subjectName}".`
              : 'Your subscription is active.',
            [{ text: 'Start learning', style: 'default' }],
          );
          await load(); // Refresh subjects so the subscribed card updates
        } else {
          Alert.alert(
            'Payment pending',
            'Your payment is being processed. Pull down to refresh in a moment.',
          );
        }
      } catch {
        Alert.alert(
          'Verification failed',
          'Could not confirm your payment. If you were charged, please contact support.',
        );
      } finally {
        setVerifyingId(null);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSubscribe = useCallback(async (subject: AcademySubject) => {
    try {
      setSubscribingId(subject.id);
      const result = await subscribeAcademyMaterial(subject.id);

      if (result?.requiresPayment && result?.checkoutUrl) {
        // Store session ID — verified via AppState when user returns from browser
        if (result.checkoutSessionId) {
          pendingSessionRef.current = {
            sessionId: result.checkoutSessionId,
            subjectId: subject.id,
          };
        }
        await Linking.openURL(result.checkoutUrl);
      } else {
        // Free subscription or instant activation
        await load();
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Subscription failed.');
    } finally {
      setSubscribingId(null);
    }
  }, [load]);

  const handleOpenSubject = useCallback((subject: AcademySubject) => {
    nav.navigate('SubjectLessons', {
      subjectId:   subject.id,
      subjectName: subject.name,
      courseId:    params.courseId,
    });
  }, [nav, params.courseId]);

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      <GradientHeader
        title={trackName}
        subtitle="Course materials"
        onBack={() => nav.goBack()}
        stats={[
          { label: 'Materials',  value: subjects.length },
          { label: 'Subscribed', value: subjects.filter((s) => s.isSubscribed).length },
        ]}
        lightColors={['#4f46e5', '#7c3aed']}
      />

      {/* Verifying banner */}
      {verifyingId !== null && (
        <View style={styles.verifyBanner}>
          <Text style={styles.verifyText}>⏳ Verifying your payment…</Text>
        </View>
      )}

      {loading ? (
        <LoadingState message="Loading subjects…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
          }
          ListEmptyComponent={
            <EmptyState emoji="📂" title="No subjects yet" subtitle="Check back later" />
          }
          renderItem={({ item }) => (
            <SubjectCard
              subject={item}
              T={T}
              isAcademy={isAcademy}
              subscribing={subscribingId === item.id}
              verifying={verifyingId === item.id}
              onSubscribe={() => handleSubscribe(item)}
              onOpen={() => handleOpenSubject(item)}
            />
          )}
        />
      )}
    </View>
  );
}

// ── Subject card ──────────────────────────────────────────────────────────────
function SubjectCard({
  subject, T, isAcademy, subscribing, verifying, onSubscribe, onOpen,
}: {
  subject: AcademySubject;
  T: ReturnType<typeof useTheme>['T'];
  isAcademy: boolean;
  subscribing: boolean;
  verifying: boolean;
  onSubscribe: () => void;
  onOpen: () => void;
}) {
  const canOpen = subject.isSubscribed;

  return (
    <View style={styles.itemWrap}>
      <Card>
        {/* Thumbnail */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: subject.imageUrl || FALLBACK_IMAGE }}
            style={styles.image}
            resizeMode="cover"
          />
          {isAcademy && (
            <View style={[
              styles.badge,
              subject.isSubscribed
                ? { backgroundColor: '#059669' }
                : subject.isPaid
                  ? { backgroundColor: '#6366f1' }
                  : { backgroundColor: '#64748b' },
            ]}>
              {subject.isSubscribed
                ? <BadgeCheck size={11} color="#fff" />
                : subject.isPaid
                  ? <CreditCard size={11} color="#fff" />
                  : null}
              <Text style={styles.badgeText}>
                {subject.isSubscribed
                  ? 'Subscribed'
                  : subject.isPaid
                    ? `${subject.price} USD`
                    : 'Free'}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoWrap}>
          <Text style={[styles.subjectName, { color: T.text }]} numberOfLines={1}>
            {subject.name}
          </Text>
          {subject.teacher?.name ? (
            <Text style={[styles.teacherName, { color: T.muted }]}>
              👨‍🏫 {subject.teacher.name}
            </Text>
          ) : null}
          {subject.description ? (
            <Text style={[styles.desc, { color: T.muted }]} numberOfLines={2}>
              {subject.description}
            </Text>
          ) : null}
          <Text style={[styles.lessonCount, { color: T.muted }]}>
            {subject.lessonCount ?? 0} lessons
          </Text>

          {/* Action buttons */}
          {isAcademy && (
            <View style={styles.actions}>
              {/* Preview — free peek for paid unsubscribed */}
              {subject.isPaid && !subject.isSubscribed && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnPreview, { borderColor: T.primary }]}
                  onPress={onOpen}
                  activeOpacity={0.8}
                >
                  <Eye size={13} color={T.primary} />
                  <Text style={[styles.btnText, { color: T.primary }]}>Preview</Text>
                </TouchableOpacity>
              )}

              {verifying ? (
                <View style={[styles.btn, styles.btnVerifying]}>
                  <Text style={[styles.btnText, { color: '#fff' }]}>Verifying…</Text>
                </View>
              ) : canOpen ? (
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={onOpen}
                  activeOpacity={0.8}
                >
                  <BookOpen size={13} color="#fff" />
                  <Text style={[styles.btnText, { color: '#fff' }]}>Open material</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, styles.btnSubscribe, subscribing && styles.btnDisabled]}
                  onPress={onSubscribe}
                  disabled={subscribing}
                  activeOpacity={0.8}
                >
                  {subject.isPaid
                    ? <CreditCard size={13} color="#fff" />
                    : <BadgeCheck size={13} color="#fff" />}
                  <Text style={[styles.btnText, { color: '#fff' }]}>
                    {subject.isPaid
                      ? (subscribing ? 'Opening Stripe…' : 'Subscribe now')
                      : (subscribing ? 'Enrolling…' : 'Enroll now')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!isAcademy && (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { marginTop: spacing[3] }]}
              onPress={onOpen}
              activeOpacity={0.8}
            >
              <ChevronRight size={13} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff' }]}>Open</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: spacing[4], paddingBottom: spacing[10] },
  itemWrap: { marginBottom: spacing[4] },

  verifyBanner: {
    backgroundColor: '#6366f1',
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  verifyText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  imageWrap: {
    position: 'relative',
    height: 160,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#1e1b4b',
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: fontWeight.bold },

  infoWrap: { padding: spacing[4] },
  subjectName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, marginBottom: spacing[1] },
  teacherName: { fontSize: fontSize.xs, marginBottom: spacing[1] },
  desc:        { fontSize: fontSize.xs, lineHeight: 18, marginBottom: spacing[2] },
  lessonCount: { fontSize: fontSize.xs, marginBottom: spacing[3] },

  actions: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },
  btnText:      { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  btnPreview:   { borderWidth: 1, backgroundColor: 'transparent' },
  btnPrimary:   { backgroundColor: '#4f46e5' },
  btnSubscribe: { backgroundColor: '#0f172a' },
  btnVerifying: { backgroundColor: '#6366f1', opacity: 0.7 },
  btnDisabled:  { opacity: 0.55 },
});
