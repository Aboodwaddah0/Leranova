import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { FileText, Download } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { EmptyState } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import type { LessonAttachment } from '../../../types/student';

interface Props {
  attachments: LessonAttachment[];
}

export function AttachmentsTab({ attachments }: Props) {
  const { T } = useTheme();

  if (!attachments || attachments.length === 0) {
    return <EmptyState emoji="📎" title="No attachments" subtitle="No files uploaded for this lesson." />;
  }

  const handleOpen = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.list}>
      {attachments.map((att, i) => (
        <TouchableOpacity
          key={String(att.id ?? i)}
          onPress={() => att.url && handleOpen(att.url)}
          activeOpacity={0.8}
          style={[styles.item, { backgroundColor: T.surface, borderColor: T.border }]}
        >
          <View style={[styles.icon, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
            <FileText size={18} color="#818cf8" />
          </View>
          <Text style={[styles.name, { color: T.text }]} numberOfLines={1}>
            {att.originalName ?? att.name ?? 'Attachment'}
          </Text>
          <Download size={16} color={T.muted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list:  { gap: spacing[2] },
  item:  {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    padding: spacing[3], borderRadius: radius.lg, borderWidth: 1,
  },
  icon:  { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  name:  { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
