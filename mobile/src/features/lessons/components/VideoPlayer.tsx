import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View, Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import { X, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, spacing, fontSize, fontWeight } from '../../../shared/theme';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface NextLessonInfo {
  id:          number;
  title:       string;
  subjectId:   number;
  courseId:    number;
  /** 1-based display number — "Lesson 3" */
  lessonIndex: number;
}

interface Props {
  videoUrl?:     string | null;
  nextLesson?:   NextLessonInfo | null;
  onNextLesson?: () => void;
  /** Start playing automatically when the video is ready (used after auto-navigation) */
  autoPlay?:     boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const { width }            = Dimensions.get('window');
const VIDEO_HEIGHT         = Math.round(width * (9 / 16));
const TRIGGER_REMAINING_MS = 8_000;   // show card when ≤ 8 s remain
const COUNTDOWN_MS         = 5_000;   // shrink bar over 5 s, then navigate

// ── Component ─────────────────────────────────────────────────────────────────
export function VideoPlayer({ videoUrl, nextLesson, onNextLesson, autoPlay = false }: Props) {
  const progressAnim = useRef(new Animated.Value(1)).current;
  const slideAnim    = useRef(new Animated.Value(72)).current;
  const timerRef     = useRef<Animated.CompositeAnimation | null>(null);
  const [showCard, setShowCard] = useState(false);
  const triggered    = useRef(false);

  // Reset when video changes (same component instance, different lesson)
  useEffect(() => {
    triggered.current = false;
    setShowCard(false);
    timerRef.current?.stop();
    progressAnim.setValue(1);
    slideAnim.setValue(72);
  }, [videoUrl, progressAnim, slideAnim]);

  // Slide card in when it first appears
  useEffect(() => {
    if (!showCard) return;
    slideAnim.setValue(72);
    Animated.spring(slideAnim, {
      toValue: 0, damping: 16, stiffness: 160, useNativeDriver: true,
    }).start();
  }, [showCard, slideAnim]);

  // Start the shrinking progress bar → auto-navigate when done
  const startCountdown = useCallback(() => {
    progressAnim.setValue(1);
    timerRef.current = Animated.timing(progressAnim, {
      toValue: 0, duration: COUNTDOWN_MS, useNativeDriver: false,
    });
    timerRef.current.start(({ finished }) => {
      if (finished) onNextLesson?.();
    });
  }, [progressAnim, onNextLesson]);

  const dismiss = useCallback(() => {
    timerRef.current?.stop();
    setShowCard(false);
    triggered.current = true;
  }, []);

  const goNext = useCallback(() => {
    dismiss();
    onNextLesson?.();
  }, [dismiss, onNextLesson]);

  const handleStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded || !nextLesson) return;

    // Video finished → navigate immediately
    if (status.didJustFinish) {
      onNextLesson?.();
      return;
    }

    // Near the end → show overlay once
    if (
      !triggered.current &&
      status.durationMillis != null &&
      status.positionMillis != null &&
      status.durationMillis > 0
    ) {
      const remaining = status.durationMillis - status.positionMillis;
      if (remaining <= TRIGGER_REMAINING_MS) {
        triggered.current = true;
        setShowCard(true);
        startCountdown();
      }
    }
  }, [nextLesson, onNextLesson, startCountdown]);

  const initial = (nextLesson?.title ?? 'L').charAt(0).toUpperCase();

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!videoUrl) {
    return <View style={[S.placeholder, { height: VIDEO_HEIGHT }]} />;
  }

  return (
    <View style={[S.wrapper, { height: VIDEO_HEIGHT }]}>
      {/* Video */}
      <Video
        source={{ uri: videoUrl }}
        style={S.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={autoPlay}
        onPlaybackStatusUpdate={handleStatus}
      />

      {/* ── Up-Next overlay ─────────────────────────────────────────────── */}
      {showCard && nextLesson && (
        <Animated.View
          style={[S.overlay, { transform: [{ translateY: slideAnim }] }]}
          pointerEvents="box-none"
        >
          <View style={S.card}>

            {/* Header row */}
            <View style={S.head}>
              <View style={S.headLeft}>
                <View style={S.dot} />
                <Text style={S.upNextLabel}>UP NEXT</Text>
              </View>
              <TouchableOpacity onPress={dismiss} hitSlop={12} style={S.closeBtn}>
                <X size={12} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            {/* Body — tap to go immediately */}
            <TouchableOpacity onPress={goNext} style={S.body} activeOpacity={0.75}>
              {/* Thumbnail */}
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={S.thumb}>
                <Text style={S.thumbInitial}>{initial}</Text>
              </LinearGradient>

              {/* Info */}
              <View style={S.info}>
                <Text style={S.lessonNum}>Lesson {nextLesson.lessonIndex}</Text>
                <Text style={S.lessonTitle} numberOfLines={2}>
                  {nextLesson.title}
                </Text>
              </View>

              <ChevronRight size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            {/* Countdown progress bar — shrinks to 0 then navigates */}
            <View style={S.barTrack}>
              <Animated.View
                style={[
                  S.barFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange:  [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  placeholder: {
    width: '100%',
    backgroundColor: '#111',
  },

  // Overlay container (bottom of video area)
  overlay: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    padding:  spacing[3],
  },

  // Card
  card: {
    borderRadius:    radius.xl,
    overflow:        'hidden',
    backgroundColor: 'rgba(6,5,20,0.93)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.10)',
    // Shadow
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius:  14,
    elevation:     12,
  },

  // Header
  head: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing[3],
    paddingTop:        spacing[2],
    paddingBottom:     spacing[1],
  },
  headLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[1.5],
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: '#a78bfa',
  },
  upNextLabel: {
    color:       '#a78bfa',
    fontSize:    9,
    fontWeight:  fontWeight.extrabold,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width:           22,
    height:          22,
    borderRadius:    11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Body
  body: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[3],
    paddingHorizontal: spacing[3],
    paddingBottom:     spacing[3],
  },

  // Thumbnail (gradient square with initial letter)
  thumb: {
    width:         58,
    height:        44,
    borderRadius:  radius.md,
    alignItems:    'center',
    justifyContent:'center',
    flexShrink:    0,
  },
  thumbInitial: {
    color:      '#fff',
    fontSize:   fontSize.xl,
    fontWeight: fontWeight.extrabold,
  },

  // Info text
  info: {
    flex: 1,
  },
  lessonNum: {
    color:         'rgba(255,255,255,0.38)',
    fontSize:      10,
    fontWeight:    fontWeight.semibold,
    letterSpacing: 0.5,
    marginBottom:  2,
    textTransform: 'uppercase',
  },
  lessonTitle: {
    color:      '#fff',
    fontSize:   fontSize.sm,
    fontWeight: fontWeight.bold,
    lineHeight: 18,
  },

  // Countdown bar
  barTrack: {
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  barFill: {
    height:          '100%',
    backgroundColor: '#818cf8',
  },
});
