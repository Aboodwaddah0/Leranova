/**
 * StudentSocialScreen — Competition & Challenges
 * Sections: Hero · Leaderboard · Class Feed
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing } from '../../../shared/theme';
import { fetchStudentSocial } from '../services/studentService';
import type { SocialData, SocialEntry, SocialFeedItem } from '../../../types/student';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n?: number | null) => (n ?? 0).toLocaleString();

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (isNaN(m) || m < 0) return '—';
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

const EVENT_ICONS: Record<string, string> = {
  LESSON_COMPLETE: '📖', QUIZ_PASS: '✅', QUIZ_PERFECT: '🏆',
  DAILY_LOGIN: '🌅', FLASHCARD_SESSION: '🃏',
  MINDMAP_SESSION: '🗺️', CHATBOT_SESSION: '🤖',
};
const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_META: Record<number, { color: string; medal: string }> = {
  1: { color: '#fbbf24', medal: '👑' },
  2: { color: '#94a3b8', medal: '🥈' },
  3: { color: '#fb923c', medal: '🥉' },
};
const PODIUM_META: Record<number, {
  color: string; blockH: number; avSize: number; avFont: number; medal: string;
}> = {
  1: { color: '#f59e0b', blockH: 72, avSize: 64, avFont: 22, medal: '🥇' },
  2: { color: '#94a3b8', blockH: 52, avSize: 52, avFont: 17, medal: '🥈' },
  3: { color: '#fb923c', blockH: 40, avSize: 44, avFont: 15, medal: '🥉' },
};

// ── animations ────────────────────────────────────────────────────────────────
function usePulse() {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 0.15, duration: 750, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1,    duration: 750, useNativeDriver: true }),
    ])).start();
  }, [a]);
  return a;
}

type Particle = { id: number; tx: number; ty: number; a: Animated.Value };
function useBurst(): [Particle[], () => void] {
  const [pts, setPts] = useState<Particle[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fire = useCallback(() => {
    const created: Particle[] = Array.from({ length: 8 }, (_, k) => {
      const ang  = k * 45 * (Math.PI / 180);
      const dist = 36 + Math.random() * 18;
      return { id: Date.now() + k, tx: Math.cos(ang) * dist, ty: Math.sin(ang) * dist, a: new Animated.Value(0) };
    });
    setPts((p) => [...p, ...created]);
    Animated.stagger(25, created.map((p) =>
      Animated.timing(p.a, { toValue: 1, duration: 600, useNativeDriver: true })
    )).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPts([]), 900);
  }, []);
  return [pts, fire];
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ h, r = 14 }: { h: number; r?: number }) {
  const a = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 0.9,  duration: 800, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.45, duration: 800, useNativeDriver: true }),
    ])).start();
  }, [a]);
  return (
    <Animated.View style={{
      height: h, borderRadius: r,
      backgroundColor: 'rgba(128,128,128,0.10)',
      opacity: a, marginBottom: spacing[3],
    }} />
  );
}

// ── design tokens ─────────────────────────────────────────────────────────────
function tok(isDark: boolean) {
  return isDark ? {
    card:    '#111029',
    border:  'rgba(255,255,255,0.07)',
    div:     'rgba(255,255,255,0.05)',
    text:    '#f5f3f7',
    sub:     'rgba(255,255,255,0.48)',
    muted:   'rgba(255,255,255,0.24)',
    rowBg:   'rgba(255,255,255,0.04)',
    youBg:   'rgba(255,255,255,0.08)',
    youBdr:  'rgba(255,255,255,0.26)',
    track:   'rgba(255,255,255,0.07)',
    accent:  '#818cf8',
    heroBg:  '#0d0c25',
    heroLbl: 'rgba(255,255,255,0.30)',
    chipBg:  'rgba(255,255,255,0.08)',
    chipBdr: 'rgba(255,255,255,0.13)',
    chipVal: '#ffffff',
    chipLbl: 'rgba(255,255,255,0.38)',
    indBg:   'rgba(255,255,255,0.06)',
    indBdr:  'rgba(255,255,255,0.10)',
    indTxt:  'rgba(255,255,255,0.65)',
    goldBg:  'rgba(251,191,36,0.09)',
    goldBdr: 'rgba(251,191,36,0.22)',
    goldTxt: '#fbbf24',
  } : {
    card:    '#ffffff',
    border:  'rgba(0,0,0,0.07)',
    div:     'rgba(0,0,0,0.05)',
    text:    '#0f172a',
    sub:     '#475569',
    muted:   '#94a3b8',
    rowBg:   '#f8fafc',
    youBg:   'rgba(99,102,241,0.07)',
    youBdr:  'rgba(99,102,241,0.35)',
    track:   'rgba(0,0,0,0.06)',
    accent:  '#6366f1',
    heroBg:  '#eef2ff',
    heroLbl: '#6366f1',
    chipBg:  'rgba(99,102,241,0.08)',
    chipBdr: 'rgba(99,102,241,0.20)',
    chipVal: '#1e1b4b',
    chipLbl: '#6366f1',
    indBg:   'rgba(99,102,241,0.07)',
    indBdr:  'rgba(99,102,241,0.16)',
    indTxt:  '#4338ca',
    goldBg:  'rgba(217,119,6,0.07)',
    goldBdr: 'rgba(217,119,6,0.22)',
    goldTxt: '#b45309',
  };
}

// ── ① Hero — centered, balanced ───────────────────────────────────────────────
function HeroCard({ social, isDark }: { social: SocialData; isDark: boolean }) {
  const C   = tok(isDark);
  const dot = usePulse();
  const [pts, fire] = useBurst();

  const rank     = social.myRank?.rank ?? social.xpRace?.me?.rank;
  const totalXp  = social.myRank?.totalXp ?? social.xpRace?.me?.totalXp ?? 0;
  const level    = social.xpRace?.me?.level;
  const streak   = social.xpRace?.me?.currentStreak ?? 0;
  const weeklyXp = social.myRank?.weeklyXp ?? 0;
  const above    = social.xpRace?.above;
  const xpGap    = social.xpRace?.xpToOvertake;

  // max 4 chips so they fit evenly on one row
  const chips = [
    rank       ? { v: `#${rank}`,      l: 'Rank',   gold: rank <= 3 } : null,
    { v: fmt(totalXp),                 l: 'Total XP', gold: false },
    level != null ? { v: `Lv ${level}`, l: 'Level', gold: false } : null,
    streak > 0 ? { v: `🔥 ${streak}`,  l: 'Streak', gold: false } : null,
  ].filter((c): c is { v: string; l: string; gold: boolean } => c !== null).slice(0, 4);

  return (
    <View style={[S.heroCard, { backgroundColor: C.heroBg, borderColor: C.border }]}>

      {/* ── top: icon centered + label + live badge ── */}
      <View style={S.heroTop}>
        {/* trophy tap-burst */}
        <TouchableOpacity onPress={fire} activeOpacity={0.75} style={S.heroIconWrap}>
          <View style={[S.heroIconBg, {
            backgroundColor: C.chipBg,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(99,102,241,0.25)',
          }]}>
            <Text style={{ fontSize: 28 }}>🏆</Text>
          </View>
          {/* burst particles */}
          {pts.map((p) => (
            <Animated.Text key={p.id} style={{
              position: 'absolute', fontSize: 11,
              transform: [
                { translateX: p.a.interpolate({ inputRange: [0, 1], outputRange: [0, p.tx] }) },
                { translateY: p.a.interpolate({ inputRange: [0, 1], outputRange: [0, p.ty] }) },
                { scale:      p.a.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1.2, 1.0, 0.1] }) },
              ],
              opacity: p.a.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.6, 0] }),
            }}>🏆</Animated.Text>
          ))}
        </TouchableOpacity>

        {/* live badge */}
        <View style={S.liveBadge}>
          <Animated.View style={[S.liveDot, { opacity: dot }]} />
          <Text style={S.liveTxt}>Live</Text>
        </View>

        {/* title */}
        <Text style={[S.heroTitle, { color: isDark ? '#fff' : '#1e1b4b', marginTop: spacing[2] }]}>
          Competition
        </Text>
        <Text style={[S.heroSub, { color: C.sub, marginTop: 2 }]}>
          Compete with classmates · earn XP
        </Text>
      </View>

      {/* ── chips: evenly spread across full width ── */}
      <View style={[S.chipsRow, { borderTopColor: C.div, borderBottomColor: C.div }]}>
        {chips.map((c, i) => (
          <View key={i} style={S.chipWrap}>
            <Text style={[S.chipVal, {
              color: c.gold ? C.goldTxt : C.chipVal,
            }]}>{c.v}</Text>
            <Text style={[S.chipLbl, {
              color: c.gold ? C.goldTxt : C.chipLbl,
            }]}>{c.l}</Text>
          </View>
        ))}
      </View>

      {/* ── status row: weekly XP + leading/overtake ── */}
      {(weeklyXp > 0 || above != null || totalXp > 0) && (
        <View style={S.statusRow}>
          {weeklyXp > 0 && (
            <View style={[S.statusPill, { backgroundColor: C.indBg, borderColor: C.indBdr }]}>
              <Text style={{ fontSize: 11, color: C.indTxt }}>
                📈 <Text style={{ fontWeight: '800' }}>+{fmt(weeklyXp)}</Text> XP this week
              </Text>
            </View>
          )}
          {xpGap != null && above ? (
            <View style={[S.statusPill, { backgroundColor: C.indBg, borderColor: C.indBdr }]}>
              <Text style={{ fontSize: 11, color: C.indTxt }}>
                ⚔️ <Text style={{ fontWeight: '800' }}>+{fmt(xpGap)}</Text> XP to beat {above.name}
              </Text>
            </View>
          ) : !above && totalXp > 0 ? (
            <View style={[S.statusPill, { backgroundColor: C.goldBg, borderColor: C.goldBdr }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.goldTxt }}>
                👑  You're leading!
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ── ② Podium ──────────────────────────────────────────────────────────────────
function Podium({ top3, isDark }: { top3: SocialEntry[]; isDark: boolean }) {
  const C = tok(isDark);
  if (top3.length < 2) return null;
  const display = [
    { s: top3[1], pos: 2 },
    { s: top3[0], pos: 1 },
    { s: top3[2], pos: 3 },
  ].filter((d) => d.s);

  return (
    <View style={[S.card, { backgroundColor: C.card, borderColor: C.border, paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: 0 }]}>
      <Text style={[S.sectionLabel, { color: C.muted, textAlign: 'center', marginBottom: spacing[4] }]}>
        TOP CHAMPIONS
      </Text>
      <View style={S.podiumRow}>
        {display.map(({ s, pos }) => {
          const P = PODIUM_META[pos];
          if (!P) return null;
          return (
            <View key={pos} style={S.podiumCol}>
              {/* crown row */}
              <View style={{ height: 28, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4 }}>
                {pos === 1 && <Text style={{ fontSize: 22 }}>👑</Text>}
              </View>
              {/* avatar */}
              <View style={{ position: 'relative', marginBottom: spacing[2] }}>
                <View style={[S.podiumAv, {
                  width: P.avSize, height: P.avSize, borderRadius: P.avSize / 2,
                  backgroundColor: P.color, borderColor: C.card,
                }]}>
                  <Text style={{ fontSize: P.avFont, fontWeight: '900', color: '#fff' }}>
                    {initials(s.name)}
                  </Text>
                </View>
                <Text style={{ position: 'absolute', bottom: -4, right: -4, fontSize: pos === 1 ? 16 : 13 }}>
                  {P.medal}
                </Text>
              </View>
              {/* name */}
              <Text style={{ fontSize: pos === 1 ? 13 : 11, fontWeight: '700', color: C.text, maxWidth: P.avSize + 16 }} numberOfLines={1}>
                {(s.name ?? '—').split(' ')[0]}
              </Text>
              {/* xp */}
              <Text style={{ fontSize: pos === 1 ? 11 : 10, fontWeight: '800', color: '#0d9488', marginBottom: spacing[2] }}>
                {fmt(s.totalXp)} XP
              </Text>
              {/* block */}
              <View style={[S.podiumBlock, {
                width: P.avSize + 16, height: P.blockH,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                borderColor: P.color,
              }]}>
                <Text style={{ fontSize: pos === 1 ? 28 : 22, fontWeight: '900', color: P.color }}>{pos}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── ③ Bar row ─────────────────────────────────────────────────────────────────
function BarRow({ s, maxXp, isMe, overrideXp, delay, isDark }: {
  s: SocialEntry; maxXp: number; isMe: boolean; overrideXp: number | null; delay: number; isDark: boolean;
}) {
  const C   = tok(isDark);
  const bar = useRef(new Animated.Value(0)).current;
  const xp  = isMe && overrideXp != null ? overrideXp : (s.totalXp ?? 0);
  const pct = Math.max(2, (xp / maxXp) * 100);
  const M   = RANK_META[s.rank];

  useEffect(() => {
    const t = setTimeout(() =>
      Animated.spring(bar, { toValue: pct, friction: 8, tension: 40, useNativeDriver: false }).start(),
    delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  const barClr  = isMe ? C.accent : (M?.color ?? C.sub);
  const avBg    = isMe ? C.youBg   : 'transparent';
  const avBdr   = isMe ? C.youBdr  : (M?.color ?? C.border);
  const avClr   = isMe ? C.accent  : (M?.color ?? C.sub);

  return (
    <View style={S.barRow}>
      {/* rank / medal */}
      <View style={S.barRank}>
        {M
          ? <Text style={{ fontSize: 14 }}>{M.medal}</Text>
          : <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted }}>#{s.rank}</Text>}
      </View>

      {/* avatar */}
      <View style={[S.barAv, { backgroundColor: avBg, borderColor: avBdr }]}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: avClr }}>{initials(s.name)}</Text>
      </View>

      {/* name + bar */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: isMe ? C.text : C.sub }} numberOfLines={1}>
            {isMe ? '⭐ You' : (s.name ?? '—').split(' ')[0]}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: M?.color ?? (isMe ? C.accent : C.text) }}>
            {fmt(xp)}
            <Text style={{ fontSize: 9, fontWeight: '400', color: C.muted }}> XP</Text>
          </Text>
          {(s.currentStreak ?? 0) > 0 && (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b', marginLeft: spacing[1.5] }}>
              🔥{s.currentStreak}
            </Text>
          )}
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: C.track, overflow: 'hidden' }}>
          <Animated.View style={{
            height: 5, borderRadius: 3, backgroundColor: barClr,
            width: bar.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          }} />
        </View>
      </View>
    </View>
  );
}

// ── ④ Leaderboard ─────────────────────────────────────────────────────────────
function LeaderboardCard({ board, myStudentId, meXp, meLevel, isDark }: {
  board: SocialEntry[]; myStudentId: number | null;
  meXp: number | null; meLevel: number | null; isDark: boolean;
}) {
  const C   = tok(isDark);
  const [showPodium, setShowPodium] = useState(false);
  const podAnim = useRef(new Animated.Value(0)).current;
  const top3    = board.slice(0, 3);
  const maxXp   = Math.ceil(Math.max(...board.slice(0, 5).map((s) => s.totalXp ?? 0), 1) * 1.2);

  const togglePodium = () => {
    const next = !showPodium;
    setShowPodium(next);
    Animated.spring(podAnim, { toValue: next ? 1 : 0, friction: 8, tension: 44, useNativeDriver: true }).start();
  };

  if (!board.length) return null;

  return (
    <View style={{ gap: spacing[2.5] }}>
      {/* ── section header ── */}
      <View style={S.secHeader}>
        <Text style={[S.sectionLabel, { color: C.muted }]}>LEADERBOARD</Text>
        {top3.length >= 2 && (
          <TouchableOpacity
            onPress={togglePodium}
            activeOpacity={0.8}
            style={[S.champBtn, {
              backgroundColor: showPodium
                ? (isDark ? 'rgba(251,191,36,0.18)' : 'rgba(251,191,36,0.13)')
                : (isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.06)'),
              borderColor: 'rgba(251,191,36,0.70)',
            }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#f59e0b' }}>
              🏆  Champions  {showPodium ? '▲' : '▾'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── podium ── */}
      {showPodium && (
        <Animated.View style={{
          opacity: podAnim,
          transform: [{ scale: podAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
        }}>
          <Podium top3={top3} isDark={isDark} />
        </Animated.View>
      )}

      {/* ── main card ── */}
      <View style={[S.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {/* bar chart — top 5 */}
        <View style={[S.barSection, { borderBottomColor: C.div }]}>
          <Text style={[S.cardLabel, { color: C.muted }]}>TOP 5 · RANKINGS</Text>
          {board.slice(0, 5).map((s, i) => {
            const isMe = s.studentId === myStudentId;
            return (
              <BarRow
                key={s.studentId} s={s} maxXp={maxXp}
                isMe={isMe} overrideXp={isMe ? meXp : null}
                delay={i * 85} isDark={isDark}
              />
            );
          })}
        </View>

        {/* rows 6+ */}
        {board.slice(5).map((s, i, arr) => {
          const isMe   = s.studentId === myStudentId;
          const fillPct = Math.min(100, ((s.currentStreak ?? 0) / 30) * 100);
          return (
            <View key={s.studentId} style={[
              S.lbRow,
              { borderBottomColor: i < arr.length - 1 ? C.div : 'transparent' },
              isMe && { backgroundColor: C.youBg, borderLeftWidth: 3, borderLeftColor: C.youBdr },
            ]}>
              <Text style={{ width: 28, textAlign: 'center', fontSize: 11, fontWeight: '700', color: isMe ? C.accent : C.muted }}>
                #{s.rank}
              </Text>
              <View style={[S.lbAv, { backgroundColor: C.rowBg, borderColor: isMe ? C.youBdr : C.border }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.sub }}>{initials(s.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: isMe ? C.text : C.sub }} numberOfLines={1}>
                  {isMe ? '⭐ You' : s.name}
                </Text>
                {(s.longestStreak ?? 0) > 0 && (
                  <Text style={{ fontSize: 10, color: C.muted }}>Best {s.longestStreak}d</Text>
                )}
              </View>
              {isMe && meLevel != null && (
                <View style={[S.lbLvl, { backgroundColor: C.rowBg }]}>
                  <Text style={{ fontSize: 10, color: C.muted, fontWeight: '600' }}>Lv.{meLevel}</Text>
                </View>
              )}
              <View style={{ width: 52, height: 4, borderRadius: 2, backgroundColor: C.track, overflow: 'hidden' }}>
                <View style={{
                  width: `${fillPct}%` as `${number}%`,
                  height: 4, borderRadius: 2,
                  backgroundColor: isMe ? C.accent : 'rgba(251,191,36,0.55)',
                }} />
              </View>
              {(s.currentStreak ?? 0) > 0 && (
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#f59e0b' }}>
                  🔥{s.currentStreak}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── ⑤ Class Feed ─────────────────────────────────────────────────────────────
function FeedCard({ feed, isDark }: { feed: SocialFeedItem[]; isDark: boolean }) {
  const C    = tok(isDark);
  const dot  = usePulse();
  const items = feed.slice(0, 6);
  const isLive = (iso: string) => Date.now() - new Date(iso).getTime() < 300_000;

  return (
    <View style={[S.card, { backgroundColor: C.card, borderColor: C.border }]}>
      {/* header */}
      <View style={[S.feedHead, { borderBottomColor: C.div }]}>
        <Text style={{ fontSize: 14 }}>📡</Text>
        <Text style={[S.cardLabel, { color: C.muted, flex: 1 }]}>CLASS ACTIVITY</Text>
        {items.length > 0 && (
          <View style={[S.badge, { backgroundColor: C.rowBg, borderColor: C.border }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted }}>{items.length}</Text>
          </View>
        )}
      </View>

      {/* items */}
      <View style={{ padding: spacing[3], gap: spacing[2] }}>
        {!items.length ? (
          <Text style={{ textAlign: 'center', paddingVertical: spacing[6], fontSize: 12, color: C.muted }}>
            No recent activity
          </Text>
        ) : items.map((item, i) => (
          <View key={i} style={[S.feedRow, { backgroundColor: C.rowBg }]}>
            {/* icon + live dot */}
            <View style={S.feedIcon}>
              <Text style={{ fontSize: 16 }}>{EVENT_ICONS[item.eventType] ?? '⚡'}</Text>
              {isLive(item.occurredAt) && (
                <Animated.View style={{
                  position: 'absolute', top: -1, right: -1,
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: '#4ade80', opacity: dot,
                }} />
              )}
            </View>
            {/* text */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: C.sub, lineHeight: 17 }} numberOfLines={2}>
                <Text style={{ fontWeight: '600', color: C.text }}>{item.studentName}</Text>
                {'  '}{item.label}
              </Text>
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{timeAgo(item.occurredAt)}</Text>
            </View>
            {/* xp */}
            {item.xpAwarded > 0 && (
              <View style={[S.xpBadge, { borderColor: C.border }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#0d9488' }}>+{item.xpAwarded}</Text>
                <Text style={{ fontSize: 9, color: C.muted }}> XP</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function StudentSocialScreen() {
  const { T, isDark } = useTheme();
  const insets        = useSafeAreaInsets();

  const [social,     setSocial]     = useState<SocialData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myStudentId = social?.xpRace?.me?.studentId ?? null;
  const meXp        = social?.xpRace?.me?.totalXp   ?? null;
  const meLevel     = social?.xpRace?.me?.level     ?? null;
  const board       = social?.streakCompetition     ?? [];

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    try {
      const d = await fetchStudentSocial();
      if (d) setSocial(d);
    } catch {
      if (!silent) setError('Could not load competition data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.background }}
      contentContainerStyle={[S.page, {
        paddingTop: insets.top + spacing[4],
        paddingBottom: insets.bottom + spacing[10],
      }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {loading ? (
        <>
          <Skel h={190} r={22} />
          <Skel h={260} />
          <Skel h={200} />
        </>
      ) : error ? (
        <View style={[S.errBox, { borderColor: 'rgba(239,68,68,0.18)', backgroundColor: 'rgba(239,68,68,0.04)' }]}>
          <Text style={{ fontSize: 28 }}>⚠️</Text>
          <Text style={{ fontSize: 13, color: '#f87171', marginTop: spacing[2], fontWeight: '500' }}>{error}</Text>
          <TouchableOpacity
            onPress={() => { setLoading(true); load(); }}
            style={[S.retryBtn, { backgroundColor: '#6366f1' }]}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !social ? (
        <Text style={{ textAlign: 'center', paddingTop: spacing[16], fontSize: 13, color: T.muted }}>
          No data yet — start earning XP!
        </Text>
      ) : (
        <View style={{ gap: spacing[4] }}>
          <HeroCard social={social} isDark={isDark} />

          {board.length > 0 && (
            <LeaderboardCard
              board={board} myStudentId={myStudentId}
              meXp={meXp} meLevel={meLevel} isDark={isDark}
            />
          )}

          {(social.socialFeed?.length ?? 0) > 0 && (
            <FeedCard feed={social.socialFeed!} isDark={isDark} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { paddingHorizontal: spacing[4] },

  // ── hero
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    ...Platform.select({
      ios:     { shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  heroTop:       { alignItems: 'center', marginBottom: spacing[4] },
  heroIconWrap:  { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: spacing[3] },
  heroIconBg:    { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  liveBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingHorizontal: spacing[2.5], paddingVertical: 3, backgroundColor: 'rgba(74,222,128,0.12)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.28)' },
  liveDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22c55e' },
  liveTxt:       { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  heroTitle:     { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  heroSub:       { fontSize: 12, textAlign: 'center' },

  // chips — each flex:1 so they spread perfectly across the row
  chipsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
  },
  chipWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],
  },
  chipVal: { fontSize: 17, fontWeight: '900', lineHeight: 22 },
  chipLbl: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },

  // status pills
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], justifyContent: 'center' },
  statusPill: { borderRadius: 12, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[1.5] },

  // shared card
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },

  // section headers
  secHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  cardLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  // Champions button
  champBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1],
    borderRadius:      22,
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[1.5],
    borderWidth:       1.5,
  },

  // podium
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing[3] },
  podiumCol: { alignItems: 'center' },
  podiumAv:  { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  podiumBlock: { borderRadius: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // bar rows
  barSection: { padding: spacing[4], paddingBottom: spacing[2], borderBottomWidth: 1 },
  barRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], paddingVertical: spacing[2] },
  barRank:    { width: 20, alignItems: 'center' },
  barAv:      { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // lb rows 6+
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], paddingHorizontal: spacing[4], paddingVertical: spacing[2.5], borderBottomWidth: 1 },
  lbAv:  { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lbLvl: { borderRadius: 6, paddingHorizontal: spacing[2], paddingVertical: 2 },

  // feed
  feedHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1 },
  feedRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2.5], borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  feedIcon: { position: 'relative', width: 30, alignItems: 'center' },
  badge:    { borderRadius: 99, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: 2 },
  xpBadge:  { flexDirection: 'row', alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: 3, backgroundColor: 'rgba(13,148,136,0.06)' },

  // error / retry
  errBox:   { alignItems: 'center', justifyContent: 'center', height: 200, borderRadius: 16, borderWidth: 1 },
  retryBtn: { marginTop: spacing[3], borderRadius: 10, paddingHorizontal: spacing[5], paddingVertical: spacing[2.5] },
});
