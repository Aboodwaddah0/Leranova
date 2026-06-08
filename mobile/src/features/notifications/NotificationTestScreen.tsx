import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import {
  Bell, BellOff, Zap, BookOpen, BarChart2, ClipboardList,
  MessageSquare, GraduationCap, DollarSign, Users, Building2,
  ChevronLeft, RefreshCw, CheckCircle, AlertCircle, Send,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../shared/hooks/useTheme';
import { useAppSelector } from '../../store/hooks';
import { spacing, radius, fontSize, fontWeight } from '../../shared/theme';
import {
  fireLocalNotification,
  sendServerTestNotification,
  sendAllServerTestNotifications,
  requestNotificationPermission,
} from '../../shared/services/notificationTestService';

// ── Notification template definitions ─────────────────────────────────────────

interface NotifTemplate {
  scenario: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  emoji: string;
  title: string;
  body: string;
  color: string;
  bg: string;
  badge?: number;
}

const STUDENT_TEMPLATES: NotifTemplate[] = [
  {
    scenario: 'STUDENT_LESSON',
    icon: BookOpen,
    emoji: '📖',
    title: '📖 New Lesson Available',
    body: 'Your teacher uploaded "Introduction to Algebra" in Mathematics. Start learning now!',
    color: '#6366f1', bg: 'rgba(99,102,241,0.12)',
  },
  {
    scenario: 'STUDENT_MARK',
    icon: BarChart2,
    emoji: '📊',
    title: '📊 Mark Received',
    body: 'You scored 87/100 on Chemistry Quiz (Term 1). Great work — keep it up!',
    color: '#10b981', bg: 'rgba(16,185,129,0.12)',
    badge: 1,
  },
  {
    scenario: 'STUDENT_ATTENDANCE',
    icon: ClipboardList,
    emoji: '✅',
    title: '✅ Attendance Marked',
    body: "Today's Mathematics attendance has been recorded as PRESENT.",
    color: '#059669', bg: 'rgba(5,150,105,0.12)',
  },
  {
    scenario: 'STUDENT_ENROLLMENT',
    icon: GraduationCap,
    emoji: '🎓',
    title: '🎓 Enrolled in New Course',
    body: 'You have been enrolled in Grade 10 - Physics. Welcome!',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
  },
  {
    scenario: 'STUDENT_MESSAGE',
    icon: MessageSquare,
    emoji: '💬',
    title: '💬 New Message',
    body: 'Your teacher sent a new message in the Mathematics group chat. Tap to read.',
    color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',
    badge: 3,
  },
];

const TEACHER_TEMPLATES: NotifTemplate[] = [
  {
    scenario: 'TEACHER_STUDENT_ENROLLED',
    icon: Users,
    emoji: '👤',
    title: '👤 New Student Enrolled',
    body: 'Ahmed Al-Rashid joined your Mathematics class (Grade 10). You now have 28 students.',
    color: '#6366f1', bg: 'rgba(99,102,241,0.12)',
  },
  {
    scenario: 'TEACHER_MESSAGE',
    icon: MessageSquare,
    emoji: '💬',
    title: '💬 New Message in Your Class',
    body: 'A student sent a message in Mathematics - Grade 10 group chat. Tap to view.',
    color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',
    badge: 2,
  },
  {
    scenario: 'TEACHER_MARK_REMINDER',
    icon: BarChart2,
    emoji: '📝',
    title: '📝 Mark Entry Reminder',
    body: 'Term 1 ends in 3 days. Please complete mark entry for all students in Chemistry.',
    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',
    badge: 1,
  },
  {
    scenario: 'TEACHER_ATTENDANCE_DUE',
    icon: ClipboardList,
    emoji: '📋',
    title: '📋 Attendance Not Entered',
    body: "Today's attendance for Mathematics has not been recorded. Students are waiting.",
    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
  },
  {
    scenario: 'TEACHER_AI_READY',
    icon: Zap,
    emoji: '🤖',
    title: '🤖 AI Content Ready',
    body: 'Flashcards and quiz for "Algebra Basics" have been generated. Review and publish to students.',
    color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',
  },
];

const ORG_TEMPLATES: NotifTemplate[] = [
  {
    scenario: 'ORG_ENROLLMENT',
    icon: GraduationCap,
    emoji: '🎓',
    title: '🎓 New Enrollments',
    body: '5 students enrolled in Biology - Grade 11 today. Total enrolled: 42 students.',
    color: '#10b981', bg: 'rgba(16,185,129,0.12)',
  },
  {
    scenario: 'ORG_REVENUE',
    icon: DollarSign,
    emoji: '💰',
    title: '💰 New Revenue',
    body: 'Payment of $150 received for Advanced Mathematics. Monthly total: $2,400.',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
  },
  {
    scenario: 'ORG_TEACHER_UPLOAD',
    icon: BookOpen,
    emoji: '👨‍🏫',
    title: "👨‍🏫 New Lesson Uploaded",
    body: "Mr. Hassan uploaded \"Newton's Laws\" in Physics - Grade 11. Total lessons: 18.",
    color: '#6366f1', bg: 'rgba(99,102,241,0.12)',
  },
  {
    scenario: 'ORG_TERM_CLOSING',
    icon: AlertCircle,
    emoji: '📅',
    title: '📅 Term Closing Soon',
    body: 'Term 1 ends in 7 days. Ensure all teachers have submitted marks and attendance.',
    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',
    badge: 1,
  },
  {
    scenario: 'ORG_PROMOTION_DONE',
    icon: CheckCircle,
    emoji: '✅',
    title: '✅ Annual Promotion Completed',
    body: '45 students promoted to the next grade successfully. 3 students retained.',
    color: '#059669', bg: 'rgba(5,150,105,0.12)',
  },
];

type RoleTab = 'STUDENT' | 'TEACHER' | 'ORG';

const ROLE_TABS: { key: RoleTab; label: string; emoji: string; color: string }[] = [
  { key: 'STUDENT', label: 'Student',     emoji: '🎓', color: '#6366f1' },
  { key: 'TEACHER', label: 'Teacher',     emoji: '👨‍🏫', color: '#10b981' },
  { key: 'ORG',     label: 'Organization',emoji: '🏫', color: '#f59e0b' },
];

function getDefaultTab(role: string | undefined): RoleTab {
  const r = (role ?? '').toUpperCase();
  if (r === 'STUDENT') return 'STUDENT';
  if (r === 'TEACHER') return 'TEACHER';
  if (r === 'SCHOOL' || r === 'ACADEMY') return 'ORG';
  return 'STUDENT';
}

function getTemplatesForTab(tab: RoleTab): NotifTemplate[] {
  if (tab === 'TEACHER') return TEACHER_TEMPLATES;
  if (tab === 'ORG')     return ORG_TEMPLATES;
  return STUDENT_TEMPLATES;
}

function getServerScenarioForTab(template: NotifTemplate, tab: RoleTab): string {
  // Map our local scenario to server scenario
  return template.scenario;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function NotificationTestScreen() {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const user = useAppSelector(s => s.auth.user);

  const [activeTab,   setActiveTab]   = useState<RoleTab>(getDefaultTab(user?.role));
  const [permission,  setPermission]  = useState<boolean | null>(null);
  const [firedLog,    setFiredLog]    = useState<{ id: string; scenario: string; time: string; mode: 'local' | 'server' }[]>([]);
  const [firing,      setFiring]      = useState<string | null>(null);
  const [firingAll,   setFiringAll]   = useState(false);
  const [serverMode,  setServerMode]  = useState(false); // toggle: local vs server

  // Check permission on mount
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermission(status === 'granted');
    });
  }, []);

  const requestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted);
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications for Learnova in your device Settings.',
      );
    }
  };

  const fireOne = useCallback(async (template: NotifTemplate) => {
    setFiring(template.scenario);
    try {
      if (serverMode) {
        // Server-side: creates DB record + FCM push to device
        const result = await sendServerTestNotification(template.scenario);
        const timeStr = new Date().toLocaleTimeString();
        setFiredLog(prev => [
          { id: String(Date.now()), scenario: template.scenario, time: timeStr, mode: 'server' },
          ...prev.slice(0, 19),
        ]);
        Alert.alert(
          '✅ Server notification sent',
          `Scenario: ${template.scenario}\nDB stored: ${result.dbStored ? 'Yes' : 'No (org user)'}\nFCM sent: ${result.pushSent ? 'Yes' : 'No FCM token'}`,
        );
      } else {
        // Local: fires instantly on device without server
        const id = await fireLocalNotification({
          title: template.title,
          body:  template.body,
          data:  { scenario: template.scenario, type: 'TEST' },
          badge: template.badge,
        });
        const timeStr = new Date().toLocaleTimeString();
        setFiredLog(prev => [
          { id: id ?? String(Date.now()), scenario: template.scenario, time: timeStr, mode: 'local' },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to send notification.');
    } finally {
      setFiring(null);
    }
  }, [serverMode]);

  const fireAll = useCallback(async () => {
    setFiringAll(true);
    const templates = getTemplatesForTab(activeTab);
    try {
      if (serverMode) {
        const result = await sendAllServerTestNotifications();
        Alert.alert(
          '✅ All server notifications sent',
          `Sent ${result.sent}/${result.total} notifications via server.`,
        );
      } else {
        // Fire local notifications with 500ms spacing
        for (let i = 0; i < templates.length; i++) {
          const t = templates[i];
          await fireLocalNotification({ title: t.title, body: t.body, data: { scenario: t.scenario }, badge: t.badge });
          if (i < templates.length - 1) await new Promise(r => setTimeout(r, 500));
        }
        Alert.alert('✅ Done', `Fired ${templates.length} local notifications. Check your notification tray!`);
      }
      const timeStr = new Date().toLocaleTimeString();
      setFiredLog(prev => [
        ...templates.map(t => ({ id: `all-${Date.now()}-${t.scenario}`, scenario: t.scenario, time: timeStr, mode: (serverMode ? 'server' : 'local') as 'local' | 'server' })),
        ...prev.slice(0, 10),
      ]);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to fire all notifications.');
    } finally {
      setFiringAll(false);
    }
  }, [activeTab, serverMode, fireLocalNotification]);

  const templates = getTemplatesForTab(activeTab);

  return (
    <View style={[styles.root, { backgroundColor: T.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#1e1b4b', '#312e81', '#4f46e5']}
        style={[styles.header, { paddingTop: insets.top + spacing[2] }]}
      >
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🔔 Notification Tester</Text>
          <Text style={styles.headerSub}>Fire fake notifications for any role</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Permission banner */}
        <TouchableOpacity
          onPress={requestPermission}
          style={[styles.permBanner, { backgroundColor: permission ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderColor: permission ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}
        >
          {permission
            ? <><CheckCircle size={16} color="#10b981" /><Text style={[styles.permText, { color: '#10b981' }]}>Notifications permitted ✓</Text></>
            : <><BellOff size={16} color="#ef4444" /><Text style={[styles.permText, { color: '#ef4444' }]}>Notifications not permitted — tap to request</Text></>
          }
        </TouchableOpacity>

        {/* Mode toggle */}
        <View style={[styles.modeRow, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modeTitle, { color: T.text }]}>
              {serverMode ? '☁️ Server Mode' : '📱 Local Mode'}
            </Text>
            <Text style={[styles.modeSub, { color: T.muted }]}>
              {serverMode
                ? 'Creates DB record + FCM push. Requires logged-in account.'
                : 'Fires immediately on this device. Works offline.'}
            </Text>
          </View>
          <Switch
            value={serverMode}
            onValueChange={setServerMode}
            trackColor={{ false: T.elevated, true: '#6366f1' }}
            thumbColor={serverMode ? '#fff' : T.muted}
          />
        </View>

        {/* Role tabs */}
        <View style={[styles.roleTabs, { backgroundColor: T.surface, borderColor: T.border }]}>
          {ROLE_TABS.map(({ key, label, emoji, color }) => {
            const active = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.roleTab, active && { backgroundColor: color }]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.8}
              >
                <Text style={styles.roleTabEmoji}>{emoji}</Text>
                <Text style={[styles.roleTabLabel, { color: active ? '#fff' : T.muted }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Fire all button */}
        <TouchableOpacity
          style={[styles.fireAllBtn, { backgroundColor: ROLE_TABS.find(t => t.key === activeTab)?.color ?? T.primary }]}
          onPress={fireAll}
          disabled={firingAll || !permission}
          activeOpacity={0.85}
        >
          {firingAll
            ? <><ActivityIndicator size="small" color="#fff" /><Text style={styles.fireAllText}>Firing all…</Text></>
            : <><RefreshCw size={18} color="#fff" /><Text style={styles.fireAllText}>Fire All {templates.length} Notifications</Text></>
          }
        </TouchableOpacity>

        {/* Notification cards */}
        <Text style={[styles.sectionLabel, { color: T.muted }]}>
          {activeTab === 'STUDENT' ? 'Student' : activeTab === 'TEACHER' ? 'Teacher / Instructor' : 'Organization'} Notifications
        </Text>

        {templates.map((t) => {
          const Icon = t.icon;
          const isFiringThis = firing === t.scenario;
          return (
            <View key={t.scenario} style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.iconCircle, { backgroundColor: t.bg }]}>
                  <Icon size={18} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifTitle, { color: T.text }]}>{t.title}</Text>
                  <Text style={[styles.notifBody, { color: T.subtext }]} numberOfLines={2}>{t.body}</Text>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <View style={[styles.scenarioPill, { backgroundColor: t.bg }]}>
                  <Text style={[styles.scenarioText, { color: t.color }]}>{t.scenario}</Text>
                </View>
                {t.badge && (
                  <View style={[styles.badgePill, { backgroundColor: '#ef4444' }]}>
                    <Text style={styles.badgeText}>badge: {t.badge}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.fireBtn, { backgroundColor: t.color, opacity: (!permission || !!firing) ? 0.5 : 1 }]}
                onPress={() => fireOne(t)}
                disabled={!permission || !!firing}
                activeOpacity={0.85}
              >
                {isFiringThis
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Bell size={14} color="#fff" /><Text style={styles.fireBtnText}>
                      {serverMode ? '☁️ Send via Server' : '📱 Fire Local'}
                    </Text></>
                }
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Fired log */}
        {firedLog.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: T.muted }]}>Recent Fired ({firedLog.length})</Text>
            <View style={[styles.logCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              {firedLog.map((entry, i) => (
                <View key={entry.id} style={[styles.logRow, i > 0 && { borderTopColor: T.border, borderTopWidth: 1 }]}>
                  <View style={[styles.logMode, { backgroundColor: entry.mode === 'server' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)' }]}>
                    {entry.mode === 'server' ? <Send size={10} color="#6366f1" /> : <Bell size={10} color="#10b981" />}
                    <Text style={[styles.logModeText, { color: entry.mode === 'server' ? '#6366f1' : '#10b981' }]}>
                      {entry.mode}
                    </Text>
                  </View>
                  <Text style={[styles.logScenario, { color: T.text }]} numberOfLines={1}>{entry.scenario}</Text>
                  <Text style={[styles.logTime, { color: T.muted }]}>{entry.time}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Tips */}
        <View style={[styles.tips, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.tipsTitle, { color: T.text }]}>💡 How to test</Text>
          {[
            '📱 Local Mode: fires instantly, works offline, no server needed.',
            '☁️ Server Mode: stores in DB + sends real FCM push to your device.',
            'Fire all to stress-test multiple notifications at once.',
            'Each role tab shows realistic notifications for that user type.',
            'Badge counts show on the app icon (iOS only).',
            'Put the app in the background before firing to see full push banner.',
          ].map((tip, i) => (
            <Text key={i} style={[styles.tip, { color: T.muted }]}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[3] },
  backBtn:       { padding: spacing[1] },
  headerTitle:   { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  headerSub:     { color: 'rgba(255,255,255,0.6)', fontSize: fontSize.xs },
  body:          { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  permBanner:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3], borderRadius: radius.xl, borderWidth: 1 },
  permText:      { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  modeRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  modeTitle:     { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  modeSub:       { fontSize: fontSize.xs, marginTop: 2 },
  roleTabs:      { flexDirection: 'row', borderRadius: radius.xl, borderWidth: 1, padding: 4, gap: 4 },
  roleTab:       { flex: 1, alignItems: 'center', paddingVertical: spacing[2], borderRadius: radius.lg, gap: 2 },
  roleTabEmoji:  { fontSize: 18 },
  roleTabLabel:  { fontSize: 10, fontWeight: '700' },
  fireAllBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: radius.xl },
  fireAllText:   { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  sectionLabel:  { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.8 },
  card:          { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  cardTop:       { flexDirection: 'row', gap: spacing[3] },
  iconCircle:    { width: 42, height: 42, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  notifTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, lineHeight: 18 },
  notifBody:     { fontSize: fontSize.xs, lineHeight: 17, marginTop: 4 },
  cardMeta:      { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  scenarioPill:  { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  scenarioText:  { fontSize: 10, fontWeight: '700' },
  badgePill:     { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  badgeText:     { color: '#fff', fontSize: 10, fontWeight: '700' },
  fireBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.xl },
  fireBtnText:   { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.extrabold },
  logCard:       { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  logRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[3] },
  logMode:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  logModeText:   { fontSize: 10, fontWeight: '700' },
  logScenario:   { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  logTime:       { fontSize: fontSize.xs },
  tips:          { borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], gap: spacing[2] },
  tipsTitle:     { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  tip:           { fontSize: fontSize.xs, lineHeight: 18 },
});
