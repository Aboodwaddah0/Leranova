import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../../shared/hooks/useTheme';
import { EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import type { MindMap } from '../../../types/student';

const CW = 900, CH = 780, CX = 450, CY = 390;
const BRANCH_R = 180, CHILD_R = 110, SPREAD = 0.42;

const COLORS = [
  { bg: '#6366f1', child: '#e0e7ff', childFg: '#3730a3', line: '#818cf8' },
  { bg: '#8b5cf6', child: '#ede9fe', childFg: '#5b21b6', line: '#a78bfa' },
  { bg: '#ec4899', child: '#fce7f3', childFg: '#9d174d', line: '#f472b6' },
  { bg: '#f59e0b', child: '#fef3c7', childFg: '#92400e', line: '#fbbf24' },
  { bg: '#10b981', child: '#d1fae5', childFg: '#065f46', line: '#34d399' },
  { bg: '#ef4444', child: '#fee2e2', childFg: '#7f1d1d', line: '#f87171' },
];

function buildPositions(mindmap: MindMap) {
  const pos: Record<string, { x: number; y: number }> = { center: { x: CX, y: CY } };
  const branches = mindmap.branches ?? [];
  const n = branches.length || 1;
  branches.forEach((branch, bi) => {
    const angle = (bi / n) * 2 * Math.PI - Math.PI / 2;
    const bx = CX + Math.cos(angle) * BRANCH_R;
    const by = CY + Math.sin(angle) * BRANCH_R;
    pos[`b${bi}`] = { x: bx, y: by };
    (branch.children ?? []).forEach((_, ci) => {
      const kids = branch.children.length;
      const fan  = kids > 1 ? (ci - (kids - 1) / 2) * SPREAD : 0;
      pos[`c${bi}_${ci}`] = {
        x: bx + Math.cos(angle + fan) * CHILD_R,
        y: by + Math.sin(angle + fan) * CHILD_R,
      };
    });
  });
  return pos;
}

interface Props {
  mindmap?: MindMap;
  published?: boolean;
}

export function MindMapTab({ mindmap, published }: Props) {
  const { isDark } = useTheme();

  if (!published || !mindmap) {
    return <EmptyState emoji="🗺️" title="No mind map yet" subtitle="Your instructor hasn't published the mind map yet." />;
  }

  const pos      = useMemo(() => buildPositions(mindmap), [mindmap]);
  const branches = mindmap.branches ?? [];
  const canvasBg = isDark
    ? 'radial-gradient(ellipse at 50% 30%, #1a1836 0%, #0d0c22 55%, #111029 100%)'
    : '#f0f4ff';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.canvas, { width: CW, height: CH, backgroundColor: isDark ? '#0d0c22' : '#f0f4ff' }]}>
          {/* SVG Lines */}
          <Svg style={StyleSheet.absoluteFillObject} width={CW} height={CH}>
            {branches.map((branch, bi) => {
              const c   = pos.center;
              const b   = pos[`b${bi}`];
              if (!c || !b) return null;
              const col = COLORS[bi % COLORS.length];
              return (
                <React.Fragment key={bi}>
                  <Line x1={c.x} y1={c.y} x2={b.x} y2={b.y} stroke={col.line} strokeWidth="2" strokeDasharray="6 3" />
                  {(branch.children ?? []).map((_, ci) => {
                    const ch = pos[`c${bi}_${ci}`];
                    if (!ch) return null;
                    return <Line key={ci} x1={b.x} y1={b.y} x2={ch.x} y2={ch.y} stroke={col.line} strokeWidth="1.5" />;
                  })}
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Center node */}
          <MapNode x={pos.center.x} y={pos.center.y} bg="linear-gradient(135deg,#6366f1,#8b5cf6)" color="#fff" label={mindmap.title} size="lg" />

          {/* Branch + child nodes */}
          {branches.map((branch, bi) => {
            const b   = pos[`b${bi}`];
            const col = COLORS[bi % COLORS.length];
            return (
              <React.Fragment key={bi}>
                {b && <MapNode x={b.x} y={b.y} bg={col.bg} color="#fff" label={branch.label} size="md" />}
                {(branch.children ?? []).map((child, ci) => {
                  const ch = pos[`c${bi}_${ci}`];
                  if (!ch) return null;
                  return <MapNode key={ci} x={ch.x} y={ch.y} bg={col.child} color={col.childFg} label={child} size="sm" />;
                })}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

function MapNode({ x, y, bg, color, label, size }: {
  x: number; y: number; bg: string; color: string; label: string; size: 'lg' | 'md' | 'sm';
}) {
  const maxW  = size === 'lg' ? 140 : size === 'md' ? 120 : 110;
  const fSize = size === 'lg' ? 12 : size === 'md' ? 11 : 10;
  const pad   = size === 'lg' ? 10 : 7;
  return (
    <View style={[
      styles.node,
      {
        left: x - maxW / 2,
        top:  y - 24,
        maxWidth: maxW,
        backgroundColor: bg,
        padding: pad,
      },
    ]}>
      <Text style={{ color, fontSize: fSize, fontWeight: fontWeight.bold, textAlign: 'center' }} numberOfLines={3}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'relative' },
  node: {
    position: 'absolute',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
});
