import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CalendarDays, Plus, Edit2, Trash2, X, Save, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import {
  fetchCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
} from '../services/organizationService';
import type { CalendarEvent, EventType, AcademicYear } from '../../../types/organization';

const EVENT_TYPES: { value: EventType; label: string; color: string; bg: string }[] = [
  { value: 'HOLIDAY',      label: 'Holiday',      color: '#10b981', bg: 'rgba(16,185,129,0.12)'   },
  { value: 'EXAM',         label: 'Exam',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)'    },
  { value: 'PTA_MEETING',  label: 'PTA Meeting',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  { value: 'ACTIVITY',     label: 'Activity',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  { value: 'ANNOUNCEMENT', label: 'Announcement',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  { value: 'OTHER',        label: 'Other',         color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
];

const EMPTY_FORM = { title: '', description: '', type: 'ANNOUNCEMENT' as EventType, startDate: '', endDate: '' };

interface Props {
  orgType: 'SCHOOL' | 'ACADEMY';
  viewingYearId: number | null;
  academicYears: AcademicYear[];
}

export function OrgCalendarTab({ orgType, viewingYearId, academicYears }: Props) {
  const { T } = useTheme();

  const [events,     setEvents]     = useState<CalendarEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<EventType | 'ALL'>('ALL');
  const [modal,      setModal]      = useState<'add' | 'edit' | null>(null);
  const [selected,   setSelected]   = useState<CalendarEvent | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    const params: Record<string, unknown> = {};
    const activeYear = academicYears.find(y => y.id === viewingYearId);
    if (activeYear) {
      params.from = String(activeYear.startDate).slice(0, 10);
      params.to   = String(activeYear.endDate).slice(0, 10);
    }
    try {
      const data = await fetchCalendarEvents(params);
      setEvents(data);
    } catch {
      Alert.alert('Error', 'Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  }, [viewingYearId, academicYears]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visible = useMemo(() => {
    if (typeFilter === 'ALL') return events;
    return events.filter(e => e.type === typeFilter);
  }, [events, typeFilter]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, startDate: new Date().toISOString().slice(0, 10) });
    setSelected(null);
    setModal('add');
  };
  const openEdit = (e: CalendarEvent) => {
    setSelected(e);
    setForm({
      title: e.title,
      description: e.description ?? '',
      type: e.type,
      startDate: String(e.startDate).slice(0, 10),
      endDate: e.endDate ? String(e.endDate).slice(0, 10) : '',
    });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.startDate) { Alert.alert('Validation', 'Title and start date required.'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
      };
      if (modal === 'add') {
        const e = await createCalendarEvent(payload);
        setEvents(prev => [e, ...prev].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      } else if (selected) {
        const e = await updateCalendarEvent(selected.id, payload);
        setEvents(prev => prev.map(x => x.id === selected.id ? { ...x, ...e } : x));
      }
      setModal(null);
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (e: CalendarEvent) => {
    Alert.alert('Delete', `Delete "${e.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteCalendarEvent(e.id); setEvents(prev => prev.filter(x => x.id !== e.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  if (loading) return <LoadingState message="Loading calendar…" />;

  const typeMeta = (type: EventType) => EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[5];

  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        {/* Type filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.chip, { borderColor: typeFilter === 'ALL' ? T.primary : T.inputBorder, backgroundColor: typeFilter === 'ALL' ? T.primary : T.inputBg }]}
            onPress={() => setTypeFilter('ALL')}
          >
            <Text style={{ color: typeFilter === 'ALL' ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>All</Text>
          </TouchableOpacity>
          {EVENT_TYPES.map(({ value, label, color }) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, { borderColor: typeFilter === value ? color : T.inputBorder, backgroundColor: typeFilter === value ? color : T.inputBg }]}
              onPress={() => setTypeFilter(typeFilter === value ? 'ALL' : value)}
            >
              <Text style={{ color: typeFilter === value ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add button */}
        <View style={styles.addRow}>
          <Text style={[styles.countText, { color: T.muted }]}>{visible.length} event{visible.length !== 1 ? 's' : ''}</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAdd}>
            <Plus size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>Add Event</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={visible}
          keyExtractor={e => String(e.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="📅" title="No events" subtitle="Add events to keep students informed." />}
          renderItem={({ item: e }) => {
            const tm = typeMeta(e.type);
            return (
              <View style={[styles.eventCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={[styles.typeStrip, { backgroundColor: tm.color }]} />
                <View style={{ flex: 1, padding: spacing[3] }}>
                  <View style={styles.eventHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: T.text }]}>{e.title}</Text>
                      <View style={[styles.typePill, { backgroundColor: tm.bg }]}>
                        <Text style={[styles.typeText, { color: tm.color }]}>{tm.label}</Text>
                      </View>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => openEdit(e)} style={styles.actionBtn}>
                        <Edit2 size={15} color={T.muted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(e)} style={styles.actionBtn}>
                        <Trash2 size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {!!e.description && (
                    <Text style={[styles.eventDesc, { color: T.muted }]} numberOfLines={2}>{e.description}</Text>
                  )}
                  <View style={styles.eventDateRow}>
                    <CalendarDays size={12} color={T.muted} />
                    <Text style={[styles.eventDate, { color: T.muted }]}>
                      {String(e.startDate).slice(0, 10)}{e.endDate ? ` → ${String(e.endDate).slice(0, 10)}` : ''}
                    </Text>
                    {e.isPublished !== undefined && (
                      <View style={[styles.pubBadge, { backgroundColor: e.isPublished ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)' }]}>
                        <Text style={{ color: e.isPublished ? '#10b981' : '#64748b', fontSize: 10, fontWeight: '700' }}>
                          {e.isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={!!modal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>{modal === 'add' ? 'Add Event' : 'Edit Event'}</Text>
            <TouchableOpacity onPress={() => setModal(null)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { key: 'title', label: 'Title *', placeholder: 'Event title' },
              { key: 'description', label: 'Description', placeholder: 'Optional description', multiline: true },
              { key: 'startDate', label: 'Start Date * (YYYY-MM-DD)', placeholder: '2025-12-25' },
              { key: 'endDate', label: 'End Date (YYYY-MM-DD)', placeholder: '2025-12-26 (optional)' },
            ].map(({ key, label, placeholder, multiline }: { key: string; label: string; placeholder: string; multiline?: boolean }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }, multiline && { height: 70, textAlignVertical: 'top' }]}
                  value={(form as Record<string, string>)[key] ?? ''}
                  onChangeText={v => setForm(prev => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={T.placeholder}
                  multiline={multiline}
                />
              </View>
            ))}

            {/* Event type picker */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Event Type</Text>
              <View style={styles.typeGrid}>
                {EVENT_TYPES.map(({ value, label, color, bg }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.typeOption, { borderColor: form.type === value ? color : T.inputBorder, backgroundColor: form.type === value ? bg : T.inputBg }]}
                    onPress={() => setForm(prev => ({ ...prev, type: value }))}
                  >
                    <Text style={{ color: form.type === value ? color : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setModal(null)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Save</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  filterBar:   { maxHeight: 48 },
  filterContent:{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], flexDirection: 'row' },
  chip:        { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1 },
  addRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  countText:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.xl },
  list:        { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[10] },
  eventCard:   { flexDirection: 'row', borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  typeStrip:   { width: 4 },
  eventHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[2] },
  eventTitle:  { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, marginBottom: 4 },
  typePill:    { alignSelf: 'flex-start', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  typeText:    { fontSize: 10, fontWeight: '700' },
  actions:     { flexDirection: 'row', gap: spacing[1] },
  actionBtn:   { padding: spacing[1] },
  eventDesc:   { fontSize: fontSize.xs, marginBottom: spacing[2] },
  eventDateRow:{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  eventDate:   { fontSize: fontSize.xs },
  pubBadge:    { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  modal:       { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:   { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:       { gap: spacing[1] },
  fieldLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:       { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  typeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[1] },
  typeOption:  { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.lg, borderWidth: 1.5 },
  modalFooter: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
