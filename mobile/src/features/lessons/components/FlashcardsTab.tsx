import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import type { Flashcard } from '../../../types/student';

const PALETTES = [
  { front: ['#6366f1', '#8b5cf6'] as [string, string], back: ['#10b981', '#059669'] as [string, string] },
  { front: ['#f59e0b', '#ef4444'] as [string, string], back: ['#3b82f6', '#6366f1'] as [string, string] },
  { front: ['#ec4899', '#8b5cf6'] as [string, string], back: ['#14b8a6', '#0ea5e9'] as [string, string] },
  { front: ['#0ea5e9', '#6366f1'] as [string, string], back: ['#f59e0b', '#f97316'] as [string, string] },
  { front: ['#10b981', '#0891b2'] as [string, string], back: ['#ec4899', '#f43f5e'] as [string, string] },
];

const CARD_HEIGHT = 220;

interface Props {
  cards?: Flashcard[];
  published?: boolean;
  lessonId: number;
}

export function FlashcardsTab({ cards, published, lessonId }: Props) {
  const { T } = useTheme();
  const [index,   setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const rotateY = useSharedValue(0);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    rotateY.value = 0;
  }, [cards]);

  if (!published || !cards || cards.length === 0) {
    return <EmptyState emoji="🃏" title="No flashcards yet" subtitle="Your instructor hasn't published flashcards yet." />;
  }

  const total   = cards.length;
  const card    = cards[index];
  const palette = PALETTES[index % PALETTES.length];

  const flip = () => {
    const next = flipped ? 0 : 1;
    rotateY.value = withTiming(next, { duration: 500 });
    setFlipped(!flipped);
  };

  const goPrev = () => { if (index > 0) { setIndex(i => i - 1); rotateY.value = 0; setFlipped(false); } };
  const goNext = () => { if (index < total - 1) { setIndex(i => i + 1); rotateY.value = 0; setFlipped(false); } };

  const frontStyle = useAnimatedStyle(() => {
    const rot = interpolate(rotateY.value, [0, 1], [0, 180], Extrapolation.CLAMP);
    return {
      transform: [{ rotateY: `${rot}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rot = interpolate(rotateY.value, [0, 1], [180, 360], Extrapolation.CLAMP);
    return {
      transform: [{ rotateY: `${rot}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={[styles.counter, { color: T.muted }]}>{index + 1} / {total}</Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: T.elevated }]}>
        <View style={[styles.progressFill, { width: `${((index + 1) / total) * 100}%`, backgroundColor: '#6366f1' }]} />
      </View>

      {/* Flip card */}
      <TouchableOpacity onPress={flip} activeOpacity={1} style={styles.cardWrap}>
        <View style={{ width: '100%', height: CARD_HEIGHT, transform: [{ perspective: 1200 }] }}>
          {/* Front */}
          <Animated.View style={[styles.face, { position: 'absolute', width: '100%', height: CARD_HEIGHT }, frontStyle]}>
            <View style={[styles.faceInner, { backgroundColor: palette.front[0] }]}>
              <Text style={styles.faceLabel}>Question</Text>
              <Text style={styles.faceText}>{card.question}</Text>
              <Text style={styles.faceTip}>Tap to reveal answer</Text>
            </View>
          </Animated.View>
          {/* Back */}
          <Animated.View style={[styles.face, { position: 'absolute', width: '100%', height: CARD_HEIGHT }, backStyle]}>
            <View style={[styles.faceInner, { backgroundColor: palette.back[0] }]}>
              <Text style={styles.faceLabel}>Answer</Text>
              <Text style={styles.faceText}>{card.answer}</Text>
              <Text style={styles.faceTip}>Tap to go back</Text>
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={goPrev} disabled={index === 0}
          style={[styles.navBtn, { backgroundColor: T.elevated, borderColor: T.border, opacity: index === 0 ? 0.3 : 1 }]}
        >
          <ChevronLeft size={20} color={T.text} />
        </TouchableOpacity>

        {/* Dots */}
        <View style={styles.dots}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index
                  ? { width: 20, backgroundColor: '#6366f1' }
                  : { width: 8, backgroundColor: T.elevated },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={goNext} disabled={index === total - 1}
          style={[styles.navBtn, { backgroundColor: T.elevated, borderColor: T.border, opacity: index === total - 1 ? 0.3 : 1 }]}
        >
          <ChevronRight size={20} color={T.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { gap: spacing[4] },
  progressRow:  { flexDirection: 'row', justifyContent: 'flex-end' },
  counter:      { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  progressBar:  { height: 4, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  cardWrap:     { width: '100%', height: CARD_HEIGHT },
  face:         { borderRadius: radius['2xl'], overflow: 'hidden' },
  faceInner:    {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing[6], borderRadius: radius['2xl'],
  },
  faceLabel: {
    color: 'rgba(255,255,255,0.8)', fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: spacing[3],
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: 3,
  },
  faceText:  { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center', lineHeight: 26 },
  faceTip:   { color: 'rgba(255,255,255,0.5)', fontSize: fontSize.xs, marginTop: spacing[4] },
  navRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:    { width: 44, height: 44, borderRadius: radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dots:      { flexDirection: 'row', gap: spacing[1.5], alignItems: 'center' },
  dot:       { height: 8, borderRadius: radius.full },
});
