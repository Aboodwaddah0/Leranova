/**
 * MindMapTab — preview card that opens MindMapModal (full-screen interactive).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Map } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import type { MindMap } from '../../../types/student';

interface Props {
  mindmap?:   MindMap;
  published?: boolean;
  onOpen:     () => void;
}

export function MindMapTab({ mindmap, published, onOpen }: Props) {
  const { T } = useTheme();

  if (!published || !mindmap) {
    return (
      <EmptyState
        emoji="🗺️"
        title="No mind map yet"
        subtitle="Your instructor hasn't published the mind map yet."
      />
    );
  }

  const branchCount = mindmap.branches?.length ?? 0;
  const nodeCount   = (mindmap.branches ?? []).reduce(
    (sum, b) => sum + (b.children?.length ?? 0) + 1, 1,
  );

  return (
    <View style={[S.card, { backgroundColor: T.surface, borderColor: T.border }]}>
      {/* Gradient header */}
      <View style={S.gradient}>
        <Text style={S.emoji}>🗺️</Text>
        <Text style={S.mapTitle}>{mindmap.title}</Text>
      </View>

      {/* Stats row */}
      <View style={[S.statsRow, { borderBottomColor: T.border }]}>
        <View style={S.statCell}>
          <Text style={[S.statVal, { color: '#6366f1' }]}>{branchCount}</Text>
          <Text style={[S.statLabel, { color: T.muted }]}>BRANCHES</Text>
        </View>
        <View style={[S.divider, { backgroundColor: T.border }]} />
        <View style={S.statCell}>
          <Text style={[S.statVal, { color: '#8b5cf6' }]}>{nodeCount}</Text>
          <Text style={[S.statLabel, { color: T.muted }]}>NODES</Text>
        </View>
      </View>

      {/* Open button */}
      <TouchableOpacity onPress={onOpen} style={S.openBtn} activeOpacity={0.85}>
        <Map size={18} color="#fff" />
        <Text style={S.openBtnText}>Open Interactive Mind Map</Text>
      </TouchableOpacity>
    </View>
  );
}

const S = StyleSheet.create({
  card:      { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  gradient:  {
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    paddingVertical: spacing[7],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  emoji:     { fontSize: 40 },
  mapTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: '#fff', textAlign: 'center' },

  statsRow:  { flexDirection: 'row', borderBottomWidth: 1 },
  statCell:  { flex: 1, alignItems: 'center', paddingVertical: spacing[4], gap: 2 },
  statVal:   { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  statLabel: { fontSize: 10, fontWeight: fontWeight.bold },
  divider:   { width: 1, marginVertical: spacing[3] },

  openBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing[2],
    margin:          spacing[4],
    borderRadius:    radius.xl,
    backgroundColor: '#6366f1',
    paddingVertical: spacing[4],
  },
  openBtnText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.base },
});
