import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  BookOpen, Flame, Trophy, Zap, Brain, Star, Layers, MessageSquare,
  ChevronRight, CheckCircle, TrendingUp, Target, AlertCircle,
  Sun, BarChart3,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../../store/hooks';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Card, Avatar, Badge } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import {
  fetchStudentCourseCatalog, fetchGamificationStats,
  fetchGamificationLeaderboard, fetchMissions,
  fetchAdaptiveMissions, fetchAIMentor, fetchActivityFeed,
} from '../services/studentService';
import { timeAgo } from '../../../shared/utils/date';
import type {
  Course, GamificationStats, MissionsData,
  AIMentor, ActivityFeedItem, ActivityFeedData, LeaderboardEntry, Mission,
} from '../../../types/student';
import type { StudentStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<StudentStackParamList>;
const { width: SCREEN_W } = Dimensions.get('window');

// ── Activity feed icon map ─────────────────────────────────────────────────────
const FEED_META: Record<string, { Icon: React.ComponentType<{ size: number; color: string }>; color: string }> = {
  LESSON_COMPLETE:   { Icon: BookOpen,      color: '#6366f1' },
  QUIZ_PASS:         { Icon: Zap,           color: '#f59e0b' },
  QUIZ_PERFECT:      { Icon: Star,          color: '#34d399' },
  DAILY_LOGIN:       { Icon: Sun,           color: '#06b6d4' },
  FLASHCARD_SESSION: { Icon: Layers,        color: '#a855f7' },
  MINDMAP_SESSION:   { Icon: Brain,         color: '#8b5cf6' },
  CHATBOT_SESSION:   { Icon: MessageSquare, color: '#3b82f6' },
};

const MISSION_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  DAILY_LESSON_1:     BookOpen,
  DAILY_LESSON_3:     BookOpen,
  DAILY_QUIZ_1:       Zap,
  DAILY_FLASHCARD_1:  Layers,
  DAILY_CHATBOT_1:    MessageSquare,
  WEEKLY_LESSON_5:    BookOpen,
  WEEKLY_LESSON_10:   BookOpen,
  WEEKLY_QUIZ_3:      Zap,
  WEEKLY_PERFECT_2:   Star,
  WEEKLY_FLASHCARD_3: Layers,
};

const URGENCY_COLORS: Record<string, string> = {
  HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#6366f1',
};

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Activity filter logic (mirrors web exactly) ───────────────────────────────
type FilterKey = 'all' | 'today' | 'yesterday' | 'week' | 'month';

function filterFeed(feed: ActivityFeedItem[], key: FilterKey): ActivityFeedItem[] {
  const now = Date.now();
  return feed.filter((item) => {
    const t = new Date(item.createdAt).getTime();
    if (key === 'today')     return t > now - 86400000;
    if (key === 'yesterday') {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const e = todayStart.getTime();
      return t >= e - 86400000 && t < e;
    }
    if (key === 'week')  return t > now - 7 * 86400000;
    if (key === 'month') return t > now - 30 * 86400000;
    return true;
  });
}

// ── XP Ring SVG ───────────────────────────────────────────────────────────────
function XpRing({ xpInLevel, size = 72 }: { xpInLevel: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDash = (Math.min(99, xpInLevel) / 100) * circumference;
  const cx = size / 2;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
      <Circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke="#818cf8" strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${strokeDash} ${circumference}`}
      />
    </Svg>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function StudentDashboardScreen() {
  const { T } = useTheme();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();
  const user   = useAppSelector((s) => s.auth.user);

  const [courses,       setCourses]       = useState<Course[]>([]);
  const [stats,         setStats]         = useState<GamificationStats>({ totalXp: 0, level: 1, currentStreak: 0, longestStreak: 0 });
  const [lbData,        setLbData]        = useState<{ leaderboard: LeaderboardEntry[]; currentStudentId: number | null; currentRank: { rank: number; totalXp: number } | null }>({ leaderboard: [], currentStudentId: null, currentRank: null });
  const [missions,      setMissions]      = useState<MissionsData>({ daily: [], weekly: [] });
  const [adaptiveMiss,  setAdaptiveMiss]  = useState<MissionsData | null>(null);
  const [mentor,        setMentor]        = useState<AIMentor | null>(null);
  const [feedData,      setFeedData]      = useState<ActivityFeedData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [actFilter,     setActFilter]     = useState<FilterKey>('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      const [
        courseData, statsData, lb, miss, adaptM, ment, feed,
      ] = await Promise.all([
        fetchStudentCourseCatalog(),
        fetchGamificationStats(),
        fetchGamificationLeaderboard(),
        fetchMissions(),
        fetchAdaptiveMissions(),
        fetchAIMentor(),
        fetchActivityFeed(),
      ]);
      setCourses(Array.isArray(courseData) ? courseData : []);
      if (statsData) setStats(statsData);
      if (lb) setLbData(lb);
      if (miss) setMissions(miss);
      if (adaptM) setAdaptiveMiss(adaptM);
      if (ment) setMentor(ment);
      if (feed) setFeedData(feed);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  }, [loading, fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ── Derived data (mirrors web) ────────────────────────────────────────────
  const xpInLevel = stats.totalXp % 100;
  const xpToNext  = 100 - xpInLevel;

  const continueLearning = useMemo(() =>
    courses.filter((c) => (c.progress ?? 0) > 0)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0)),
    [courses],
  );
  const newCourses = useMemo(() =>
    courses.filter((c) => (c.progress ?? 0) === 0),
    [courses],
  );

  const dailyMissions  = adaptiveMiss?.daily  ?? missions.daily;
  const weeklyMissions = adaptiveMiss?.weekly ?? missions.weekly;

  const weekFeed = useMemo(() => {
    const feed = feedData?.feed ?? [];
    const weekAgo = Date.now() - 7 * 86400000;
    return feed.filter((item) => new Date(item.createdAt).getTime() > weekAgo);
  }, [feedData]);

  const lessonsThisWeek = weekFeed.filter((i) => i.type === 'LESSON_COMPLETE').length;
  const xpThisWeek      = weekFeed.reduce((sum, i) => sum + (i.xp || 0), 0);

  const filteredFeed = useMemo(() =>
    filterFeed(feedData?.feed ?? [], actFilter),
    [feedData, actFilter],
  );

  const tierLabel = stats.level >= 15 ? 'Expert'
    : stats.level >= 10 ? 'Advanced'
    : stats.level >= 5  ? 'Intermediate'
    : 'Beginner';

  const firstName = user?.name?.split(' ')?.[0] ?? 'Student';

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: T.background }]}>
        <SkeletonDashboard T={T} insetTop={insets.top} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.root, { backgroundColor: T.background, opacity: fadeAnim }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
      >

        {/* ── Streak Warning Banner ──────────────────────────────────────── */}
        {feedData && !feedData.engagedToday && stats.currentStreak > 0 && (
          <StreakBanner streak={stats.currentStreak} />
        )}

        {/* ── Hero Header ───────────────────────────────────────────────── */}
        <HeroHeader
          user={user}
          firstName={firstName}
          stats={stats}
          xpInLevel={xpInLevel}
          xpToNext={xpToNext}
          tierLabel={tierLabel}
          currentRank={lbData.currentRank}
          insetTop={insets.top}
          T={T}
        />

        <View style={[styles.body, { paddingBottom: spacing[8] }]}>

          {/* ── Continue Learning ─────────────────────────────────────────── */}
          {continueLearning.length > 0 && (
            <View style={styles.section}>
              <SectionLabel label="Continue Learning" T={T} />
              <ResumeCourseCard
                course={continueLearning[0]}
                onPress={() => nav.navigate('CourseDetails', { courseId: continueLearning[0].id, courseName: continueLearning[0].name })}
              />
              {continueLearning.slice(1, 3).map((c) => (
                <MiniCourseCard
                  key={c.id} course={c} T={T}
                  onPress={() => nav.navigate('CourseDetails', { courseId: c.id, courseName: c.name })}
                />
              ))}
            </View>
          )}

          {/* ── AI Mentor ─────────────────────────────────────────────────── */}
          {mentor && <AIMentorCard mentor={mentor} T={T} />}

          {/* ── Today's Focus (Daily Missions) ────────────────────────────── */}
          <TodaysFocusCard daily={dailyMissions} weekly={weeklyMissions} T={T} />

          {/* ── This Week's Progress ──────────────────────────────────────── */}
          <WeekProgressCard
            streak={stats.currentStreak}
            lessonsThisWeek={lessonsThisWeek}
            xpThisWeek={xpThisWeek}
            T={T}
          />

          {/* ── My Specializations / New Courses ─────────────────────────── */}
          {newCourses.length > 0 && (
            <View style={styles.section}>
              <SectionLabel label="My Courses" T={T} />
              {newCourses.slice(0, 4).map((c, i) => (
                <MiniCourseCard
                  key={c.id} course={c} T={T}
                  onPress={() => nav.navigate('CourseDetails', { courseId: c.id, courseName: c.name })}
                  index={i}
                />
              ))}
            </View>
          )}

          {/* ── Activity Feed ─────────────────────────────────────────────── */}
          {(feedData?.feed ?? []).length > 0 && (
            <ActivityFeedSection
              feed={filteredFeed}
              allFeed={feedData?.feed ?? []}
              activeFilter={actFilter}
              onFilterChange={setActFilter}
              T={T}
            />
          )}

        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ── Skeleton loading ──────────────────────────────────────────────────────────
function SkeletonDashboard({ T, insetTop }: { T: ReturnType<typeof useTheme>['T']; insetTop: number }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);
  const box = (h: number, mt = 0, br = 12) => (
    <Animated.View style={{ height: h, marginTop: mt, borderRadius: br, backgroundColor: T.elevated, opacity: pulse }} />
  );
  return (
    <ScrollView style={{ padding: spacing[5], paddingTop: insetTop + spacing[5] }}>
      {box(200, 0, 24)}
      {box(80, 16, 16)}
      {box(120, 16, 20)}
      {box(150, 16, 20)}
      {box(100, 16, 20)}
    </ScrollView>
  );
}

// ── Streak Banner ─────────────────────────────────────────────────────────────
function StreakBanner({ streak }: { streak: number }) {
  return (
    <View style={styles.streakBanner}>
      <Flame size={14} color="#f59e0b" />
      <Text style={styles.streakBannerText} numberOfLines={2}>
        {streak > 0
          ? `${streak}-day streak at risk — engage with anything today to keep it going.`
          : 'Streak broken. Any lesson, quiz, or AI tool will start a new one.'}
      </Text>
    </View>
  );
}

// ── Hero Header ───────────────────────────────────────────────────────────────
function HeroHeader({
  user, firstName, stats, xpInLevel, xpToNext, tierLabel, currentRank, insetTop, T,
}: {
  user: { name?: string | null; avatarUrl?: string | null } | null;
  firstName: string;
  stats: GamificationStats;
  xpInLevel: number;
  xpToNext: number;
  tierLabel: string;
  currentRank: { rank: number; totalXp: number } | null;
  insetTop: number;
  T: ReturnType<typeof useTheme>['T'];
}) {
  return (
    <View style={[styles.hero, { paddingTop: insetTop + spacing[4] }]}>
      {/* Bg gradient */}
      <LinearGradient
        colors={['rgba(12,11,35,0.97)', 'rgba(18,16,48,0.99)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Glow overlay */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#ec4899']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.2 }]}
      />

      <View style={styles.heroContent}>
        {/* Top row */}
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreet}>{getGreeting()} 👋</Text>
            <Text style={styles.heroName}>{firstName}</Text>
            <View style={styles.tierRow}>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{tierLabel}</Text>
              </View>
              {currentRank && (
                <View style={[styles.tierBadge, { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)' }]}>
                  <Trophy size={9} color="#fbbf24" />
                  <Text style={[styles.tierText, { color: '#fbbf24' }]}>Rank #{currentRank.rank}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Avatar with XP ring */}
          <View style={styles.avatarWrap}>
            <XpRing xpInLevel={xpInLevel} size={76} />
            <View style={styles.avatarInner}>
              <Avatar name={user?.name} uri={user?.avatarUrl} size={52} />
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{stats.level}</Text>
            </View>
          </View>
        </View>

        {/* XP progress bar */}
        <View style={styles.xpBarWrap}>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpInLevel}%` }]} />
          </View>
          <Text style={styles.xpBarLabel}>{xpToNext} XP to next level</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { icon: Flame,    value: `${stats.currentStreak}🔥`, label: 'Streak' },
            { icon: Zap,      value: stats.totalXp,              label: 'Total XP' },
            { icon: BarChart3, value: `${xpInLevel}/100`,        label: 'Level XP' },
          ].map((item, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statVal}>{item.value}</Text>
              <Text style={styles.statLbl}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Resume Course Card (dark glassmorphism) ───────────────────────────────────
function ResumeCourseCard({ course, onPress }: { course: Course; onPress: () => void }) {
  const totalSegs = 8;
  const filledSegs = Math.max(0, Math.min(totalSegs, Math.round(((course.progress ?? 0) / 100) * totalSegs)));
  const initial = (course.name || 'C').charAt(0).toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.resumeCard}>
      {/* Top accent line */}
      <LinearGradient
        colors={['transparent', '#6366f1', '#8b5cf6', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.resumeAccent}
      />
      <View style={styles.resumeInner}>
        {/* Continue label */}
        <View style={styles.resumeHeader}>
          <View style={styles.resumeLiveDot} />
          <Text style={styles.resumeHeaderText}>Continue Learning</Text>
          <Text style={styles.resumePct}>{course.progress ?? 0}%</Text>
        </View>

        <View style={styles.resumeBody}>
          {/* Icon */}
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.resumeIconWrap}>
            <Text style={styles.resumeInitial}>{initial}</Text>
          </LinearGradient>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <Text style={styles.resumeCourseName} numberOfLines={2}>{course.name}</Text>
            <View style={styles.resumeSegRow}>
              {Array.from({ length: totalSegs }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.resumeSeg,
                    i < filledSegs
                      ? { backgroundColor: '#6366f1' }
                      : { backgroundColor: 'rgba(255,255,255,0.1)' },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Resume button */}
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.resumeBtn}>
            <Text style={styles.resumeBtnText}>Resume</Text>
          </LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Mini Course Card ──────────────────────────────────────────────────────────
function MiniCourseCard({
  course, T, onPress, index = 0,
}: { course: Course; T: ReturnType<typeof useTheme>['T']; onPress: () => void; index?: number }) {
  const pct = course.progress ?? 0;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginBottom: spacing[3] }}>
      <Card>
        <View style={styles.miniCourseRow}>
          <LinearGradient
            colors={([['#6366f1', '#8b5cf6'], ['#14b8a6', '#0d9488'], ['#f59e0b', '#d97706'], ['#ec4899', '#db2777']] as [string, string][])[index % 4]}
            style={styles.miniCourseIcon}
          >
            <BookOpen size={18} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.miniCourseName, { color: T.text }]} numberOfLines={1}>{course.name}</Text>
            <Text style={[styles.miniCourseCat, { color: T.muted }]}>{course.category}</Text>
            {pct > 0 && (
              <View style={styles.miniProgress}>
                <View style={[styles.miniProgressBg, { backgroundColor: T.elevated }]}>
                  <View style={[styles.miniProgressFill, { width: `${pct}%` }]} />
                </View>
                <Text style={[styles.miniProgressPct, { color: T.muted }]}>{pct}%</Text>
              </View>
            )}
          </View>
          <ChevronRight size={16} color={T.muted} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── AI Mentor Card ────────────────────────────────────────────────────────────
function AIMentorCard({ mentor, T }: { mentor: AIMentor; T: ReturnType<typeof useTheme>['T'] }) {
  const urgColor = URGENCY_COLORS[mentor.nextBestAction?.urgency ?? 'LOW'] ?? '#6366f1';
  const ActionIcon = mentor.nextBestAction?.icon === 'FLAME' ? Flame
    : mentor.nextBestAction?.icon === 'QUIZ' ? Zap
    : mentor.nextBestAction?.icon === 'BRAIN' ? Brain
    : Target;

  return (
    <View style={styles.mentorCard}>
      <LinearGradient
        colors={['#0f172a', '#1e1b4b', '#2d1b69']}
        style={StyleSheet.absoluteFill}
      />
      {/* Header */}
      <View style={styles.mentorHeader}>
        <View style={styles.mentorIconWrap}>
          <Brain size={15} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mentorSubtitle}>AI Mentor</Text>
          <Text style={styles.mentorTitle}>Your coaching report</Text>
        </View>
        {mentor.aiPowered && (
          <View style={styles.aiPoweredBadge}>
            <Zap size={7} color="#a78bfa" />
            <Text style={styles.aiPoweredText}>AI</Text>
          </View>
        )}
      </View>

      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        {/* Narrative */}
        {!!mentor.narrative && (
          <View style={styles.mentorNarrative}>
            <Text style={styles.mentorNarrativeText}>"{mentor.narrative}"</Text>
          </View>
        )}

        {/* Warning */}
        {mentor.urgentWarning && (
          <View style={styles.mentorWarning}>
            <AlertCircle size={12} color="#fcd34d" />
            <Text style={styles.mentorWarningText}>{mentor.urgentWarning.message}</Text>
          </View>
        )}

        {/* Success */}
        {mentor.successHighlight && (
          <View style={styles.mentorSuccess}>
            <CheckCircle size={12} color="#34d399" />
            <Text style={styles.mentorSuccessText}>{mentor.successHighlight.message}</Text>
          </View>
        )}

        {/* Next action */}
        {mentor.nextBestAction && (
          <View style={[styles.mentorAction, { borderColor: `${urgColor}50` }]}>
            <View style={[styles.mentorActionIcon, { backgroundColor: urgColor }]}>
              <ActionIcon size={13} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mentorActionLabel}>Next action</Text>
              <Text style={styles.mentorActionText}>{mentor.nextBestAction.action}</Text>
              {!!mentor.nextBestAction.reason && (
                <Text style={styles.mentorActionReason}>{mentor.nextBestAction.reason}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Today's Focus (Missions) ──────────────────────────────────────────────────
function TodaysFocusCard({
  daily, weekly, T,
}: { daily: Mission[]; weekly: Mission[]; T: ReturnType<typeof useTheme>['T'] }) {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const list = tab === 'daily' ? daily.slice(0, 5) : weekly.slice(0, 5);
  const weeklyDone = weekly.filter((m) => m.completed).length;

  return (
    <View style={[styles.focusCard, { backgroundColor: T.surface, borderColor: T.border }]}>
      {/* Header */}
      <View style={styles.focusHeader}>
        <Text style={[styles.focusTitle, { color: T.text }]}>Today's Focus</Text>
        {/* Tab switcher */}
        <View style={[styles.tabSwitcher, { backgroundColor: T.elevated }]}>
          {(['daily', 'weekly'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive, { color: tab === t ? '#fff' : T.muted }]}>
                {t === 'daily' ? 'Daily' : 'Weekly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {list.length === 0 ? (
        <View style={styles.focusEmpty}>
          <Target size={24} color={T.muted} />
          <Text style={[styles.focusEmptyText, { color: T.muted }]}>No tasks — enjoy your progress!</Text>
        </View>
      ) : (
        list.map((m) => <MissionRow key={m.key} mission={m} period={tab} T={T} />)
      )}

      {/* Weekly footer */}
      {tab === 'weekly' && weekly.length > 0 && (
        <View style={[styles.focusFooter, { borderTopColor: T.border }]}>
          <Text style={[styles.focusFooterText, { color: T.muted }]}>Weekly: {weeklyDone}/{weekly.length} done</Text>
          <View style={[styles.focusFooterBar, { backgroundColor: T.elevated }]}>
            <View style={[styles.focusFooterFill, { width: weekly.length ? `${Math.round((weeklyDone / weekly.length) * 100)}%` : '0%' }]} />
          </View>
        </View>
      )}
    </View>
  );
}

function MissionRow({ mission: m, period, T }: { mission: Mission; period: string; T: ReturnType<typeof useTheme>['T'] }) {
  const pct  = m.goal > 0 ? Math.min(100, Math.round((m.progress / m.goal) * 100)) : 0;
  const Icon = MISSION_ICONS[m.key] ?? Target;
  const isDone = m.completed;

  const iconColor = isDone ? '#34d399' : period === 'daily' ? '#f59e0b' : '#6366f1';
  const barColor  = isDone ? '#34d399' : period === 'daily' ? '#f59e0b' : '#6366f1';

  return (
    <View style={[
      styles.missionRow,
      isDone
        ? { backgroundColor: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.2)' }
        : { backgroundColor: T.elevated, borderColor: T.border },
    ]}>
      {m.recommended && !isDone && (
        <View style={styles.missionAccent} />
      )}
      <View style={[styles.missionIcon, { backgroundColor: `${iconColor}20` }]}>
        {isDone
          ? <CheckCircle size={14} color={iconColor} />
          : <Icon size={14} color={iconColor} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.missionLabel, { color: isDone ? T.muted : T.text }, isDone && { textDecorationLine: 'line-through' }]}>
          {m.label}
        </Text>
        <View style={[styles.missionBarBg, { backgroundColor: T.border }]}>
          <View style={[styles.missionBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.missionProgress, { color: isDone ? '#34d399' : T.muted }]}>
          {isDone ? '✓ Complete' : `${m.progress}/${m.goal}`}
        </Text>
      </View>
      <View style={styles.missionRight}>
        <Text style={[styles.missionPct, { color: isDone ? '#34d399' : T.muted }]}>{pct}%</Text>
        <View style={[styles.missionXpBadge, { backgroundColor: isDone ? 'rgba(52,211,153,0.15)' : `${iconColor}20` }]}>
          <Text style={[styles.missionXpText, { color: iconColor }]}>+{m.xp}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Burst particle on press (mirrors web's lnBurst / _StatCard) ──────────────
type Particle = { id: number; tx: number; ty: number; anim: Animated.Value };

function useBurst(): [Particle[], () => void] {
  const [particles, setParticles] = useState<Particle[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    const created: Particle[] = Array.from({ length: 9 }, (_, k) => {
      const angle = (-150 + k * 37.5) * (Math.PI / 180);
      const dist  = 44 + Math.random() * 22;
      return {
        id:   Date.now() + k,
        tx:   Math.cos(angle) * dist,
        ty:   Math.sin(angle) * dist,
        anim: new Animated.Value(0),
      };
    });
    setParticles((prev) => [...prev, ...created]);
    Animated.stagger(
      40,
      created.map((p) =>
        Animated.timing(p.anim, { toValue: 1, duration: 750, useNativeDriver: true }),
      ),
    ).start();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setParticles([]), 1200);
  }, []);

  return [particles, trigger];
}

function WeekStatCard({
  emoji, value, label, T,
}: { emoji: string; value: number; label: string; T: ReturnType<typeof useTheme>['T'] }) {
  const [particles, trigger] = useBurst();

  return (
    <TouchableOpacity
      onPress={trigger}
      activeOpacity={0.85}
      style={[styles.weekStat, { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }]}
    >
      {/* Burst particles */}
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={{
            position:  'absolute',
            alignSelf: 'center',
            transform: [
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.tx] }) },
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.ty] }) },
              { scale:      p.anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.85, 0.25] }) },
            ],
            opacity: p.anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.85, 0] }),
          }}
        >
          <Text style={{ fontSize: 14 }}>{emoji}</Text>
        </Animated.View>
      ))}

      <Text style={styles.weekStatEmoji}>{emoji}</Text>
      <Text style={[styles.weekStatVal, { color: T.text }]}>{value}</Text>
      <Text style={[styles.weekStatLbl, { color: T.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Week Progress ─────────────────────────────────────────────────────────────
function WeekProgressCard({
  streak, lessonsThisWeek, xpThisWeek, T,
}: { streak: number; lessonsThisWeek: number; xpThisWeek: number; T: ReturnType<typeof useTheme>['T'] }) {
  return (
    <View style={[styles.weekCard, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Text style={[styles.weekTitle, { color: T.text }]}>This Week's Progress</Text>
      <View style={styles.weekGrid}>
        <WeekStatCard emoji="🔥" value={streak}          label="Day streak"   T={T} />
        <WeekStatCard emoji="📚" value={lessonsThisWeek} label="Lessons done" T={T} />
        <WeekStatCard emoji="⚡" value={xpThisWeek}      label="XP earned"    T={T} />
      </View>
    </View>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
const FEED_FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'today',     label: 'Today'     },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week',      label: 'This week' },
  { key: 'month',     label: 'This month' },
];

function ActivityFeedSection({
  feed, allFeed, activeFilter, onFilterChange, T,
}: {
  feed: ActivityFeedItem[];
  allFeed: ActivityFeedItem[];
  activeFilter: FilterKey;
  onFilterChange: (k: FilterKey) => void;
  T: ReturnType<typeof useTheme>['T'];
}) {
  return (
    <View style={[styles.feedCard, { backgroundColor: T.surface, borderColor: T.border }]}>
      {/* Header */}
      <View style={styles.feedHeader}>
        <View style={styles.feedIconWrap}>
          <TrendingUp size={15} color="#fff" />
        </View>
        <View>
          <Text style={[styles.feedSubtitle, { color: T.muted }]}>Recent Activity</Text>
          <Text style={[styles.feedTitle, { color: T.text }]}>Your activity timeline</Text>
        </View>
      </View>

      {/* Filter chips — scrollable row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FEED_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => onFilterChange(f.key)}
            style={[
              styles.filterChip,
              activeFilter === f.key
                ? { backgroundColor: 'rgba(99,102,241,0.25)', borderColor: 'rgba(99,102,241,0.45)' }
                : { backgroundColor: T.elevated, borderColor: T.border },
            ]}
          >
            <Text style={[
              styles.filterChipText,
              { color: activeFilter === f.key ? '#a78bfa' : T.muted },
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed items */}
      {feed.length === 0 ? (
        <View style={styles.feedEmpty}>
          <Text style={[styles.feedEmptyText, { color: T.muted }]}>No activity in this period</Text>
        </View>
      ) : (
        feed.slice(0, 10).map((item, i) => (
          <FeedItem key={i} item={item} T={T} />
        ))
      )}
    </View>
  );
}

function FeedItem({ item, T }: { item: ActivityFeedItem; T: ReturnType<typeof useTheme>['T'] }) {
  const meta = FEED_META[item.type] ?? { Icon: Zap, color: '#6366f1' };
  const isLive = Date.now() - new Date(item.createdAt).getTime() < 300_000;

  return (
    <View style={[styles.feedRow, { borderTopColor: T.border }]}>
      <View style={styles.feedIconBox}>
        <View style={[styles.feedIcon, { backgroundColor: `${meta.color}20` }]}>
          <meta.Icon size={12} color={meta.color} />
        </View>
        {isLive && <View style={styles.feedLiveDot} />}
      </View>
      <Text style={[styles.feedLabel, { color: T.text }]} numberOfLines={1}>{item.label}</Text>
      <View style={styles.feedRight}>
        {item.xp > 0 && (
          <View style={styles.feedXpBadge}>
            <Text style={styles.feedXpText}>+{item.xp}</Text>
          </View>
        )}
        <Text style={[styles.feedTime, { color: T.muted }]}>{timeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ label, T }: { label: string; T: ReturnType<typeof useTheme>['T'] }) {
  return <Text style={[styles.sectionLabel, { color: T.text }]}>{label}</Text>;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Streak banner
  streakBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    margin: spacing[4], marginBottom: 0,
    padding: spacing[3], borderRadius: radius.xl,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  streakBannerText: { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: '#f59e0b' },

  // Hero
  hero: { overflow: 'hidden', borderBottomLeftRadius: radius['2xl'], borderBottomRightRadius: radius['2xl'] },
  heroContent: { paddingHorizontal: spacing[5], paddingBottom: spacing[6] },
  heroTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[3] },
  heroGreet: { color: 'rgba(255,255,255,0.6)', fontSize: fontSize.sm, marginBottom: 2 },
  heroName:  { color: '#fff', fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold, marginBottom: spacing[2] },
  tierRow:   { flexDirection: 'row', gap: spacing[2] },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing[2], paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
    backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.4)',
  },
  tierText: { color: '#a78bfa', fontSize: 9, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.8 },

  avatarWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  levelBadge: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#6366f1', borderRadius: radius.full,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0f0f1a',
  },
  levelText: { color: '#fff', fontSize: 9, fontWeight: fontWeight.extrabold },

  xpBarWrap:  { marginBottom: spacing[4] },
  xpBarBg:    { height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.full, overflow: 'hidden', marginBottom: 4 },
  xpBarFill:  { height: '100%', backgroundColor: '#818cf8', borderRadius: radius.full },
  xpBarLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: fontWeight.semibold },

  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statItem: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg, padding: spacing[3], alignItems: 'center',
  },
  statVal: { color: '#fff', fontSize: fontSize.base, fontWeight: fontWeight.bold },
  statLbl: { color: 'rgba(255,255,255,0.5)', fontSize: fontSize.xs, marginTop: 2 },

  body: { padding: spacing[5] },
  section: { marginBottom: spacing[5] },
  sectionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing[3] },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: spacing[3] },
  actionItem: { flex: 1, alignItems: 'center', gap: spacing[1] },
  actionIcon: { width: 52, height: 52, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  // Resume card (dark glassmorphism)
  resumeCard: {
    borderRadius: radius['2xl'], overflow: 'hidden', marginBottom: spacing[3],
    backgroundColor: 'rgba(25,35,55,0.65)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
  },
  resumeAccent: { height: 2 },
  resumeInner: { padding: spacing[4] },
  resumeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] },
  resumeLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#14b8a6' },
  resumeHeaderText: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: fontWeight.bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  resumePct:  { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  resumeBody: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  resumeIconWrap: {
    width: 64, height: 64, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  resumeInitial: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  resumeCourseName: { color: '#fff', fontSize: fontSize.base, fontWeight: fontWeight.bold, marginBottom: spacing[2], lineHeight: 20 },
  resumeSegRow: { flexDirection: 'row', gap: 3, height: 8 },
  resumeSeg:    { flex: 1, borderRadius: 3 },
  resumeBtn:    { paddingHorizontal: spacing[4], paddingVertical: spacing[2.5], borderRadius: radius.xl },
  resumeBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  // Mini course card
  miniCourseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  miniCourseIcon: { width: 42, height: 42, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  miniCourseName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  miniCourseCat:  { fontSize: fontSize.xs, marginBottom: spacing[1] },
  miniProgress:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  miniProgressBg: { flex: 1, height: 4, borderRadius: radius.full, overflow: 'hidden' },
  miniProgressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: radius.full },
  miniProgressPct:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, width: 28 },

  // AI Mentor card
  mentorCard: {
    borderRadius: radius['2xl'], overflow: 'hidden', marginBottom: spacing[5],
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  mentorHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    padding: spacing[4], borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  mentorIconWrap: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: 'rgba(139,92,246,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  mentorSubtitle: { color: '#a78bfa', fontSize: 9, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 1 },
  mentorTitle:    { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  aiPoweredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing[2], paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
    backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.3)',
  },
  aiPoweredText: { color: '#a78bfa', fontSize: 8, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.8 },

  mentorNarrative: {
    borderRadius: radius.lg, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing[3],
  },
  mentorNarrativeText: { color: '#c4b5fd', fontSize: fontSize.xs, fontWeight: fontWeight.medium, lineHeight: 18 },

  mentorWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    borderRadius: radius.lg, borderWidth: 1,
    backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.25)',
    padding: spacing[3],
  },
  mentorWarningText: { flex: 1, color: '#fcd34d', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, lineHeight: 17 },

  mentorSuccess: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    borderRadius: radius.lg, borderWidth: 1,
    backgroundColor: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)',
    padding: spacing[3],
  },
  mentorSuccessText: { flex: 1, color: '#6ee7b7', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, lineHeight: 17 },

  mentorAction: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    borderRadius: radius.lg, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing[3],
  },
  mentorActionIcon: { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  mentorActionLabel:  { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.5 },
  mentorActionText:   { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.extrabold, marginTop: 2 },
  mentorActionReason: { color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 },

  // Focus / Missions
  focusCard: {
    borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden', marginBottom: spacing[5],
  },
  focusHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing[4], paddingBottom: spacing[3],
  },
  focusTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  tabSwitcher: { flexDirection: 'row', borderRadius: radius.lg, padding: 2 },
  tabBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.md },
  tabBtnActive: { backgroundColor: '#6366f1' },
  tabBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  tabBtnTextActive: {},
  focusEmpty: { alignItems: 'center', padding: spacing[6], gap: spacing[2] },
  focusEmptyText: { fontSize: fontSize.sm },
  focusFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[2],
  },
  focusFooterText: { fontSize: 10, fontWeight: fontWeight.medium },
  focusFooterBar:  { width: 64, height: 4, borderRadius: radius.full, overflow: 'hidden' },
  focusFooterFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: radius.full },

  // Mission row
  missionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    marginHorizontal: spacing[3], marginBottom: spacing[2],
    borderRadius: radius.xl, borderWidth: 1, padding: spacing[3],
  },
  missionAccent: {
    position: 'absolute', left: 0, top: spacing[2], bottom: spacing[2],
    width: 3, borderRadius: 2, backgroundColor: '#8b5cf6',
  },
  missionIcon:  { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  missionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold },
  missionBarBg: { height: 3, borderRadius: radius.full, overflow: 'hidden', marginTop: 4, marginBottom: 2 },
  missionBarFill: { height: '100%', borderRadius: radius.full },
  missionProgress: { fontSize: 9, fontWeight: fontWeight.semibold },
  missionRight: { alignItems: 'flex-end', gap: 3 },
  missionPct:  { fontSize: 9, fontWeight: fontWeight.extrabold },
  missionXpBadge: { paddingHorizontal: spacing[1.5], paddingVertical: 2, borderRadius: radius.full },
  missionXpText:  { fontSize: 8, fontWeight: fontWeight.extrabold },

  // Week progress
  weekCard: { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], marginBottom: spacing[5] },
  weekTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, marginBottom: spacing[4] },
  weekGrid:  { flexDirection: 'row', gap: spacing[3] },
  weekStat:  {
    flex: 1, borderRadius: radius.xl, borderWidth: 1,
    padding: spacing[3], alignItems: 'center', gap: 3,
  },
  weekStatEmoji: { fontSize: fontSize.xl },
  weekStatVal:   { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  weekStatLbl:   { fontSize: fontSize.xs, textAlign: 'center' },

  // Achievements
  achCard: {
    borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden',
    padding: spacing[4], marginBottom: spacing[5],
  },
  achHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  achIconWrap: {
    width: 36, height: 36, borderRadius: radius.xl,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
  },
  achSubtitle: { color: '#a78bfa', fontSize: 9, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.8 },
  achTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  achPct:      { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: '#7c3aed' },
  achBarBg:    { height: 6, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing[3] },
  achBarFill:  { height: '100%', backgroundColor: '#8b5cf6', borderRadius: radius.full },
  achLatest: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    borderRadius: radius.xl, borderWidth: 1, padding: spacing[3], marginBottom: spacing[2],
  },
  achLatestLabel: { fontSize: 9, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.5 },
  achLatestName:  { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold },
  achNewBadge:    { backgroundColor: '#6366f1', borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  achNewText:     { color: '#fff', fontSize: 7, fontWeight: fontWeight.extrabold, letterSpacing: 0.5 },
  achEmpty: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderRadius: radius.xl, padding: spacing[3], marginBottom: spacing[2],
  },
  achEmptyText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  achMore: { textAlign: 'center', fontSize: 10, fontWeight: fontWeight.semibold },

  // Leaderboard
  lbCard:   { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden', marginBottom: spacing[5] },
  lbHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderBottomWidth: 1 },
  lbIconWrap: { width: 36, height: 36, borderRadius: radius.xl, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  lbSubtitle: { fontSize: 9, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.8 },
  lbTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  lbSeeAll:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  lbSeeAllText: { color: '#818cf8', fontSize: 10, fontWeight: fontWeight.bold },
  lbEmpty:    { padding: spacing[6], alignItems: 'center' },
  lbEmptyText: { fontSize: fontSize.sm },
  lbRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  lbRank:  { width: 28, height: 28, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  lbRankText: { fontSize: 10, fontWeight: fontWeight.extrabold },
  lbName:  { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  lbStreak: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: spacing[1.5], paddingVertical: 2, borderRadius: radius.full, backgroundColor: 'rgba(249,115,22,0.1)' },
  lbStreakText: { fontSize: 9, fontWeight: fontWeight.extrabold, color: '#f97316' },
  lbXp:    { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold },
  lbDots:  { textAlign: 'center', padding: spacing[1], fontSize: 8, letterSpacing: 4 },

  // Activity feed
  feedCard:   { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden', marginBottom: spacing[5] },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderBottomWidth: 1 },
  feedIconWrap: { width: 36, height: 36, borderRadius: radius.xl, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  feedSubtitle: { fontSize: 9, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.8 },
  feedTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },

  filterScroll: { maxHeight: 44 },
  filterRow:    { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2] },
  filterChip:   { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.lg, borderWidth: 1 },
  filterChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  feedRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: 1 },
  feedIconBox: { position: 'relative', width: 28, height: 28 },
  feedIcon:    { width: 28, height: 28, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  feedLiveDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399', borderWidth: 2, borderColor: '#fff' },
  feedLabel:   { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  feedRight:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  feedXpBadge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.full, backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  feedXpText:  { color: '#f59e0b', fontSize: 9, fontWeight: fontWeight.extrabold },
  feedTime:    { fontSize: 10, fontWeight: fontWeight.semibold },
  feedEmpty:   { padding: spacing[6], alignItems: 'center' },
  feedEmptyText: { fontSize: fontSize.sm },
});
