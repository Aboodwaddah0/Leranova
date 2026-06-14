import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { Search, Users, Eye, StickyNote, Plus, Trash2, X } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState, Avatar } from '../../../shared/components';
import { fetchStudents, fetchMySubjects, fetchStudentNotes, createStudentNote, deleteStudentNote } from '../services/instructorService';
import type { InstructorStudent, InstructorSubject, StudentNote } from '../../../types/instructor';

const calcAge = (dob: string | null | undefined) => {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

interface Props { isSchool: boolean; }

export function InstructorStudentsTab({ isSchool }: Props) {
  const { T } = useTheme();

  const [students,   setStudents]   = useState<InstructorStudent[]>([]);
  const [subjects,   setSubjects]   = useState<InstructorSubject[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [search,        setSearch]        = useState('');
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);

  // Student detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selected,    setSelected]    = useState<InstructorStudent | null>(null);

  // Notes (school only)
  const [notes,      setNotes]      = useState<StudentNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle,   setNoteTitle]   = useState('');
  const [savingNote,  setSavingNote]  = useState(false);

  // Pagination
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);

  // Load subjects once on mount — independent of filter state
  useEffect(() => {
    fetchMySubjects().then(setSubjects).catch(() => {});
  }, []);

  const loadStudents = useCallback(async (filter: number | null, isRefresh = false) => {
    if (!isRefresh) setFilterLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filter) params.Subject_id = filter;
      const s = await fetchStudents(params);
      setStudents(s);
      setPage(1);
    } catch {
      Alert.alert('Error', 'Failed to load students.');
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(subjectFilter); }, [subjectFilter, loadStudents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadStudents(subjectFilter, true),
      fetchMySubjects().then(setSubjects).catch(() => {}),
    ]);
    setRefreshing(false);
  }, [subjectFilter, loadStudents]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const paged = useMemo(() => visible.slice(0, page * PAGE_SIZE), [visible, page]);

  const openDetail = async (s: InstructorStudent) => {
    setSelected(s);
    setDetailModal(true);
    if (isSchool) {
      setNotesLoading(true);
      const n = await fetchStudentNotes(s.id).catch(() => []);
      setNotes(n);
      setNotesLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selected || !noteContent.trim()) { Alert.alert('Required', 'Note content is required.'); return; }
    setSavingNote(true);
    try {
      const note = await createStudentNote({ studentId: selected.id, title: noteTitle || undefined, content: noteContent });
      setNotes(prev => [note, ...prev]);
      setNoteContent('');
      setNoteTitle('');
    } catch {
      Alert.alert('Error', 'Failed to add note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = (noteId: number) => {
    Alert.alert('Delete', 'Delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteStudentNote(noteId); setNotes(prev => prev.filter(n => n.id !== noteId)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  if (loading) return <LoadingState message="Loading students…" />;

  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        {/* Subject filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.chip, { borderColor: !subjectFilter ? T.primary : T.inputBorder, backgroundColor: !subjectFilter ? T.primary : T.inputBg }]}
            onPress={() => setSubjectFilter(null)}
          >
            <Text style={{ color: !subjectFilter ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>All</Text>
          </TouchableOpacity>
          {subjects.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, { borderColor: subjectFilter === s.id ? T.primary : T.inputBorder, backgroundColor: subjectFilter === s.id ? T.primary : T.inputBg }]}
              onPress={() => setSubjectFilter(prev => prev === s.id ? null : s.id)}
            >
              <Text style={{ color: subjectFilter === s.id ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }} numberOfLines={1}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {filterLoading && (
          <View style={[styles.filterOverlay, { backgroundColor: T.background }]}>
            <ActivityIndicator size="small" color={T.primary} />
          </View>
        )}

        {/* Search */}
        <View style={styles.searchPad}>
          <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <Search size={16} color={T.muted} />
            <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder="Search students…" placeholderTextColor={T.placeholder} />
          </View>
        </View>

        <View style={styles.countRow}>
          <Users size={14} color={T.muted} />
          <Text style={[styles.countText, { color: T.muted }]}>{visible.length} student{visible.length !== 1 ? 's' : ''}</Text>
        </View>

        <FlatList
          data={paged}
          keyExtractor={s => String(s.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="🎓" title="No students" subtitle={search ? 'No students match your search.' : 'No students assigned to you yet.'} />}
          onEndReached={() => { if (paged.length < visible.length) setPage(p => p + 1); }}
          onEndReachedThreshold={0.3}
          renderItem={({ item: s }) => {
            const age = calcAge(s.dob);
            return (
              <View style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}>
                <Avatar size={44} uri={s.avatarUrl} name={`${s.firstName ?? ''} ${s.lastName ?? ''}`} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: T.text }]}>{s.firstName} {s.lastName}</Text>
                  {!!s.email && <Text style={[styles.sub, { color: T.muted }]}>{s.email}</Text>}
                  {age !== null && <Text style={[styles.sub, { color: T.muted }]}>Age: {age}</Text>}
                </View>
                <TouchableOpacity onPress={() => openDetail(s)} style={[styles.detailBtn, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
                  <Eye size={16} color="#6366f1" />
                </TouchableOpacity>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Student Detail Modal */}
      <Modal visible={detailModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>
              {selected ? `${selected.firstName} ${selected.lastName}` : 'Student'}
            </Text>
            <TouchableOpacity onPress={() => setDetailModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {selected && (
              <View style={[styles.detailCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                {[
                  { label: 'Email',   value: selected.email },
                  { label: 'Address', value: selected.address },
                  { label: 'DOB',     value: selected.dob ? String(selected.dob).slice(0, 10) : null },
                  { label: 'Age',     value: calcAge(selected.dob) !== null ? String(calcAge(selected.dob)) : null },
                  { label: 'Gender',  value: selected.gender },
                  { label: 'Phone',   value: selected.phone },
                  { label: 'Reg#',    value: selected.registrationNumber },
                ].filter(r => r.value).map(({ label, value }) => (
                  <View key={label} style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: T.muted }]}>{label}</Text>
                    <Text style={[styles.infoValue, { color: T.text }]}>{value}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Notes section (school only) */}
            {isSchool && selected && (
              <>
                <Text style={[styles.sectionTitle, { color: T.text }]}>Notes</Text>

                {/* Add note form */}
                <View style={[styles.noteForm, { backgroundColor: T.surface, borderColor: T.border }]}>
                  <TextInput
                    style={[styles.noteInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                    value={noteTitle}
                    onChangeText={setNoteTitle}
                    placeholder="Title (optional)"
                    placeholderTextColor={T.placeholder}
                  />
                  <TextInput
                    style={[styles.noteInput, styles.noteContent, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                    value={noteContent}
                    onChangeText={setNoteContent}
                    placeholder="Note content *"
                    placeholderTextColor={T.placeholder}
                    multiline
                  />
                  <TouchableOpacity style={[styles.addNoteBtn, { backgroundColor: T.primary }]} onPress={handleAddNote} disabled={savingNote}>
                    {savingNote
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Plus size={14} color="#fff" /><Text style={{ color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Add Note</Text></>
                    }
                  </TouchableOpacity>
                </View>

                {notesLoading ? <LoadingState message="Loading notes…" /> : notes.length === 0 ? (
                  <Text style={[styles.noNotes, { color: T.muted }]}>No notes yet.</Text>
                ) : notes.map(n => (
                  <View key={n.id} style={[styles.noteCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                    <View style={{ flex: 1 }}>
                      {!!n.title && <Text style={[styles.noteTitle, { color: T.text }]}>{n.title}</Text>}
                      <Text style={[styles.noteBody, { color: T.subtext }]}>{n.content}</Text>
                      <Text style={[styles.noteDate, { color: T.muted }]}>{n.createdAt ? String(n.createdAt).slice(0, 10) : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteNote(n.id)} style={styles.deleteNoteBtn}>
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  filterOverlay: { position: 'absolute', top: 46, left: 0, right: 0, alignItems: 'center', paddingVertical: 6, zIndex: 10 },
  filterBar:    { maxHeight: 46 },
  filterContent:{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], flexDirection: 'row' },
  chip:         { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1, maxWidth: 140 },
  searchPad:    { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput:  { flex: 1, fontSize: fontSize.sm },
  countRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  countText:    { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  list:         { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[10] },
  row:          { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  name:         { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sub:          { fontSize: fontSize.xs, marginTop: 2 },
  detailBtn:    { padding: spacing[2], borderRadius: radius.lg },
  modal:        { flex: 1 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:    { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  detailCard:   { borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  infoLabel:    { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', width: 70, color: '#64748b' },
  infoValue:    { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  noteForm:     { borderRadius: radius.xl, borderWidth: 1, padding: spacing[3], gap: spacing[2] },
  noteInput:    { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2], fontSize: fontSize.sm },
  noteContent:  { height: 70, textAlignVertical: 'top' },
  addNoteBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[2], borderRadius: radius.lg },
  noNotes:      { textAlign: 'center', fontSize: fontSize.sm, padding: spacing[4] },
  noteCard:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, padding: spacing[3] },
  noteTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 2 },
  noteBody:     { fontSize: fontSize.sm, lineHeight: 18 },
  noteDate:     { fontSize: fontSize.xs, marginTop: spacing[1] },
  deleteNoteBtn:{ padding: spacing[1] },
});
