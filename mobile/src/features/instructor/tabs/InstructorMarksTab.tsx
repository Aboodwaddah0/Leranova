import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Plus, Search, Edit2, Trash2, X, Save, Filter } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import {
  fetchMarks, createMark, updateMark, deleteMark,
  fetchMySubjects, fetchStudents, fetchAcademicYears, fetchTerms,
} from '../services/instructorService';
import type { InstructorMark, InstructorSubject, InstructorStudent } from '../../../types/instructor';
import type { AcademicYear, Term } from '../../../types/organization';

const fmt = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2).replace(/\.00$/, '') : '0';
};

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  id: null as number | null,
  Student_id: '', Subject_id: '',
  Numbers: '', OutOf: '100',
  ExamPercentage: '100', MarkType: 'EXAM',
  time: new Date().toISOString().slice(0, 10),
  termId: '', academicYearId: '',
};

interface Props { isSchool: boolean; }

export function InstructorMarksTab({ isSchool }: Props) {
  const { T } = useTheme();

  const [marks,       setMarks]       = useState<InstructorMark[]>([]);
  const [subjects,    setSubjects]    = useState<InstructorSubject[]>([]);
  const [students,    setStudents]    = useState<InstructorStudent[]>([]);
  const [years,       setYears]       = useState<AcademicYear[]>([]);
  const [terms,       setTerms]       = useState<Term[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterTerm,    setFilterTerm]    = useState('all');
  const [page,          setPage]          = useState(1);

  const load = useCallback(async () => {
    try {
      const [m, s, y] = await Promise.all([
        fetchMarks(),
        fetchMySubjects().catch(() => []),
        fetchAcademicYears().catch(() => []),
      ]);
      setMarks(m);
      setSubjects(s);
      setYears(y);
      const activeYear = y.find((yr: AcademicYear) => yr.isActive);
      if (activeYear) {
        const t = await fetchTerms(activeYear.id).catch(() => []);
        setTerms(t);
        setForm(prev => ({ ...prev, academicYearId: String(activeYear.id) }));
      }
    } catch {
      Alert.alert('Error', 'Failed to load marks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  // Load students when subject changes in form
  const loadStudents = useCallback(async (subjectId: string) => {
    if (!subjectId) { setStudents([]); return; }
    setStudentsLoading(true);
    const s = await fetchStudents({ Subject_id: Number(subjectId) }).catch(() => []);
    setStudents(s);
    setStudentsLoading(false);
  }, []);

  useEffect(() => { loadStudents(form.Subject_id); }, [form.Subject_id]);

  // Load terms when year changes in form
  useEffect(() => {
    if (!form.academicYearId) { setTerms([]); setForm(prev => ({ ...prev, termId: '' })); return; }
    fetchTerms(Number(form.academicYearId))
      .then(t => {
        setTerms(t);
        const active = t.find((x: Term) => x.status === 'ACTIVE');
        if (active) setForm(prev => ({ ...prev, termId: String(active.id) }));
      })
      .catch(() => {});
  }, [form.academicYearId]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, academicYearId: String(years.find(y => y.isActive)?.id ?? '') });
    setModal(true);
  };
  const openEdit = (m: InstructorMark) => {
    setForm({
      id: m.id,
      Student_id: String(m.Student_id ?? m.studentId ?? ''),
      Subject_id: String(m.Subject_id ?? m.subjectId ?? ''),
      Numbers: String(m.Numbers),
      OutOf: String(m.OutOf),
      ExamPercentage: String(m.ExamPercentage ?? 100),
      MarkType: m.MarkType ?? 'EXAM',
      time: m.time ? String(m.time).slice(0, 10) : '',
      termId: String(m.termId ?? ''),
      academicYearId: String(m.academicYearId ?? ''),
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.Student_id || !form.Subject_id || !form.Numbers || !form.OutOf) {
      Alert.alert('Validation', 'Student, subject, score and outOf are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        Student_id: Number(form.Student_id),
        Subject_id: Number(form.Subject_id),
        Numbers: parseFloat(form.Numbers),
        OutOf: parseFloat(form.OutOf),
        ExamPercentage: parseFloat(form.ExamPercentage) || 100,
        MarkType: form.MarkType || 'EXAM',
        time: form.time || undefined,
        ...(form.termId ? { termId: Number(form.termId) } : {}),
        ...(form.academicYearId ? { academicYearId: Number(form.academicYearId) } : {}),
      };
      if (form.id) {
        const updated = await updateMark(form.id, payload);
        setMarks(prev => prev.map(m => m.id === form.id ? { ...m, ...updated } : m));
      } else {
        const created = await createMark(payload);
        if (created) setMarks(prev => [created, ...prev]);
      }
      setModal(false);
      Alert.alert('Success', form.id ? 'Mark updated.' : 'Mark added.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (m: InstructorMark) => {
    Alert.alert('Delete', 'Delete this mark?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteMark(m.id); setMarks(prev => prev.filter(x => x.id !== m.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  const filtered = useMemo(() => {
    let m = marks;
    if (filterSubject) m = m.filter(x => String(x.Subject_id ?? x.subjectId) === filterSubject);
    if (filterStudent.trim()) {
      const q = filterStudent.trim().toLowerCase();
      m = m.filter(x => (x.studentName ?? '').toLowerCase().includes(q));
    }
    if (filterTerm !== 'all') m = m.filter(x => String(x.termId) === filterTerm);
    return m;
  }, [marks, filterSubject, filterStudent, filterTerm]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  if (loading) return <LoadingState message="Loading marks…" />;

  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        {/* Search + Add */}
        <View style={styles.toolbar}>
          <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <Search size={16} color={T.muted} />
            <TextInput style={[styles.searchInput, { color: T.text }]} value={filterStudent} onChangeText={setFilterStudent} placeholder="Search student…" placeholderTextColor={T.placeholder} />
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAdd}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Subject filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.chip, { borderColor: !filterSubject ? T.primary : T.inputBorder, backgroundColor: !filterSubject ? T.primary : T.inputBg }]}
            onPress={() => setFilterSubject('')}
          >
            <Text style={{ color: !filterSubject ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>All Subjects</Text>
          </TouchableOpacity>
          {subjects.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, { borderColor: filterSubject === String(s.id) ? T.primary : T.inputBorder, backgroundColor: filterSubject === String(s.id) ? T.primary : T.inputBg }]}
              onPress={() => setFilterSubject(filterSubject === String(s.id) ? '' : String(s.id))}
            >
              <Text style={{ color: filterSubject === String(s.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }} numberOfLines={1}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Term filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          {[{ id: 'all', name: 'All Terms' }, ...terms].map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.chip, { borderColor: filterTerm === String(t.id) ? T.primary : T.inputBorder, backgroundColor: filterTerm === String(t.id) ? T.primary : T.inputBg }]}
              onPress={() => setFilterTerm(String(t.id))}
            >
              <Text style={{ color: filterTerm === String(t.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={paged}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="📝" title="No marks" subtitle="Add marks for your students." />}
          onEndReached={() => { if (paged.length < filtered.length) setPage(p => p + 1); }}
          onEndReachedThreshold={0.3}
          renderItem={({ item: m }) => {
            const pct = m.OutOf > 0 ? (m.Numbers / m.OutOf) * 100 : 0;
            return (
              <View style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: T.text }]}>{m.studentName ?? `Student #${m.Student_id ?? m.studentId}`}</Text>
                  <Text style={[styles.sub, { color: T.muted }]}>{m.subjectName ?? `Subject #${m.Subject_id ?? m.subjectId}`}</Text>
                  <View style={styles.tagsRow}>
                    <View style={[styles.tag, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
                      <Text style={[styles.tagText, { color: '#6366f1' }]}>{m.MarkType ?? 'EXAM'}</Text>
                    </View>
                    {m.time && <Text style={[styles.tagText, { color: T.muted }]}>{String(m.time).slice(0, 10)}</Text>}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
                  <Text style={[styles.score, { color: T.text }]}>{fmt(m.Numbers)}/{fmt(m.OutOf)}</Text>
                  <Text style={[styles.pct, { color: pct >= 50 ? '#10b981' : '#ef4444' }]}>{pct.toFixed(0)}%</Text>
                  <Text style={[styles.weight, { color: T.muted }]}>W: {fmt(m.ExamPercentage)}%</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(m)} style={styles.actionBtn}>
                    <Edit2 size={15} color={T.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(m)} style={styles.actionBtn}>
                    <Trash2 size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add / Edit Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>{form.id ? 'Edit Mark' : 'Add Mark'}</Text>
            <TouchableOpacity onPress={() => setModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Academic Year */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Academic Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {years.map(y => (
                    <TouchableOpacity key={y.id}
                      style={[styles.chip, { borderColor: form.academicYearId === String(y.id) ? T.primary : T.inputBorder, backgroundColor: form.academicYearId === String(y.id) ? T.primary : T.inputBg }]}
                      onPress={() => setForm(prev => ({ ...prev, academicYearId: String(y.id) }))}
                    >
                      <Text style={{ color: form.academicYearId === String(y.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{y.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Term */}
            {terms.length > 0 && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Term</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {terms.map(t => (
                      <TouchableOpacity key={t.id}
                        style={[styles.chip, { borderColor: form.termId === String(t.id) ? T.primary : T.inputBorder, backgroundColor: form.termId === String(t.id) ? T.primary : T.inputBg }]}
                        onPress={() => setForm(prev => ({ ...prev, termId: String(t.id) }))}
                      >
                        <Text style={{ color: form.termId === String(t.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Subject */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {subjects.map(s => (
                    <TouchableOpacity key={s.id}
                      style={[styles.chip, { borderColor: form.Subject_id === String(s.id) ? T.primary : T.inputBorder, backgroundColor: form.Subject_id === String(s.id) ? T.primary : T.inputBg }]}
                      onPress={() => setForm(prev => ({ ...prev, Subject_id: String(s.id), Student_id: '' }))}
                    >
                      <Text style={{ color: form.Subject_id === String(s.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Student */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Student *</Text>
              {studentsLoading ? <ActivityIndicator size="small" color={T.primary} /> : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {students.map(s => (
                      <TouchableOpacity key={s.id}
                        style={[styles.chip, { borderColor: form.Student_id === String(s.id) ? T.primary : T.inputBorder, backgroundColor: form.Student_id === String(s.id) ? T.primary : T.inputBg }]}
                        onPress={() => setForm(prev => ({ ...prev, Student_id: String(s.id) }))}
                      >
                        <Text style={{ color: form.Student_id === String(s.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{s.firstName} {s.lastName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Scores */}
            <View style={styles.scoreRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Score *</Text>
                <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={form.Numbers} onChangeText={v => setForm(prev => ({ ...prev, Numbers: v }))} placeholder="0" placeholderTextColor={T.placeholder} keyboardType="decimal-pad" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Out Of *</Text>
                <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={form.OutOf} onChangeText={v => setForm(prev => ({ ...prev, OutOf: v }))} placeholder="100" placeholderTextColor={T.placeholder} keyboardType="decimal-pad" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Weight %</Text>
                <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={form.ExamPercentage} onChangeText={v => setForm(prev => ({ ...prev, ExamPercentage: v }))} placeholder="100" placeholderTextColor={T.placeholder} keyboardType="decimal-pad" />
              </View>
            </View>

            {/* Type */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Assessment Type</Text>
              <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={form.MarkType} onChangeText={v => setForm(prev => ({ ...prev, MarkType: v }))} placeholder="EXAM" placeholderTextColor={T.placeholder} />
            </View>

            {/* Date */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Date (YYYY-MM-DD)</Text>
              <TextInput style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]} value={form.time} onChangeText={v => setForm(prev => ({ ...prev, time: v }))} placeholder="2025-06-01" placeholderTextColor={T.placeholder} />
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setModal(false)}>
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
  root:         { flex: 1 },
  toolbar:      { flexDirection: 'row', gap: spacing[3], padding: spacing[4], paddingBottom: spacing[2] },
  searchBox:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput:  { flex: 1, fontSize: fontSize.sm },
  addBtn:       { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  filterBar:    { maxHeight: 46 },
  filterContent:{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2], flexDirection: 'row' },
  chip:         { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1, maxWidth: 160 },
  list:         { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[10] },
  row:          { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  name:         { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sub:          { fontSize: fontSize.xs, marginTop: 2 },
  tagsRow:      { flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] },
  tag:          { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999 },
  tagText:      { fontSize: 10, fontWeight: '700' },
  score:        { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  pct:          { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  weight:       { fontSize: fontSize.xs },
  actions:      { flexDirection: 'row', gap: spacing[1] },
  actionBtn:    { padding: spacing[2] },
  modal:        { flex: 1 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:    { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:        { gap: spacing[1] },
  fieldLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:        { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  chipRow:      { flexDirection: 'row', gap: spacing[2] },
  scoreRow:     { flexDirection: 'row', gap: spacing[3] },
  modalFooter:  { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
