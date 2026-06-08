import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  BookOpen, Plus, Edit2, Trash2, X, Save, ChevronRight,
  ChevronLeft, Layers, Search,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import {
  fetchCourses, createCourse, updateCourse, deleteCourse,
  fetchSubjects, createSubject, updateSubject, deleteSubject,
  fetchTeachers,
} from '../services/organizationService';
import type { OrgCourse, OrgSubject, OrgTeacher } from '../../../types/organization';

const formatGradeName = (level: number | null | undefined) =>
  level !== null && level !== undefined ? `Grade ${level}` : '';

const COURSE_FORM_INIT = { Name: '', Description: '', GradeLevel: '', Teacher_id: '', Start: '', End: '', price: '', isPaid: false, level: '' };
const SUBJECT_FORM_INIT = { name: '', Description: '', Teacher_id: '', price: '', isPaid: false };

interface Props { orgType: 'SCHOOL' | 'ACADEMY'; }

export function OrgCoursesTab({ orgType }: Props) {
  const { T } = useTheme();
  const isSchool = orgType === 'SCHOOL';

  const [courses,    setCourses]    = useState<OrgCourse[]>([]);
  const [teachers,   setTeachers]   = useState<OrgTeacher[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  // Drill-down: selected course → subjects
  const [drillCourse,  setDrillCourse]  = useState<OrgCourse | null>(null);
  const [subjects,     setSubjects]     = useState<OrgSubject[]>([]);
  const [subLoading,   setSubLoading]   = useState(false);

  // Modals
  const [courseModal, setCourseModal] = useState<'add' | 'edit' | null>(null);
  const [subjectModal, setSubjectModal] = useState<'add' | 'edit' | null>(null);
  const [selCourse,   setSelCourse]   = useState<OrgCourse | null>(null);
  const [selSubject,  setSelSubject]  = useState<OrgSubject | null>(null);
  const [courseForm,  setCourseForm]  = useState({ ...COURSE_FORM_INIT });
  const [subjectForm, setSubjectForm] = useState({ ...SUBJECT_FORM_INIT });
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([fetchCourses(), fetchTeachers().catch(() => [])]);
      setCourses(c);
      setTeachers(t);
    } catch {
      Alert.alert('Error', 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (drillCourse) {
      const data = await fetchSubjects(drillCourse.id).catch(() => []);
      setSubjects(data);
    } else {
      await load();
    }
    setRefreshing(false);
  }, [load, drillCourse]);

  const openCourse = useCallback(async (c: OrgCourse) => {
    setDrillCourse(c);
    setSubLoading(true);
    const data = await fetchSubjects(c.id).catch(() => []);
    setSubjects(data);
    setSubLoading(false);
  }, []);

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => (c.Name ?? '').toLowerCase().includes(q));
  }, [courses, search]);

  // ── Course CRUD ─────────────────────────────────────────────────────────────
  const openAddCourse = () => {
    setCourseForm({ ...COURSE_FORM_INIT });
    setSelCourse(null);
    setCourseModal('add');
  };
  const openEditCourse = (c: OrgCourse) => {
    setSelCourse(c);
    setCourseForm({ Name: c.Name || '', Description: c.Description || '', GradeLevel: String(c.GradeLevel ?? ''), Teacher_id: String(c.Teacher_id ?? ''), Start: c.Start ? String(c.Start).slice(0,10) : '', End: c.End ? String(c.End).slice(0,10) : '', price: String(c.price ?? ''), isPaid: c.isPaid ?? false, level: c.level || '' });
    setCourseModal('edit');
  };
  const handleSaveCourse = async () => {
    if (!courseForm.Name.trim()) { Alert.alert('Validation', 'Course name is required.'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        Name: courseForm.Name,
        Description: courseForm.Description || undefined,
        ...(courseForm.GradeLevel ? { GradeLevel: Number(courseForm.GradeLevel) } : {}),
        ...(courseForm.Teacher_id ? { Teacher_id: Number(courseForm.Teacher_id) } : {}),
        ...(courseForm.Start ? { Start: courseForm.Start } : {}),
        ...(courseForm.End ? { End: courseForm.End } : {}),
        ...(courseForm.price ? { price: parseFloat(courseForm.price), isPaid: true } : { isPaid: false }),
        ...(courseForm.level ? { level: courseForm.level } : {}),
      };
      if (courseModal === 'add') {
        const c = await createCourse(payload);
        setCourses(prev => [...prev, c]);
      } else if (selCourse) {
        const c = await updateCourse(selCourse.id, payload);
        setCourses(prev => prev.map(x => x.id === selCourse.id ? { ...x, ...c } : x));
        if (drillCourse?.id === selCourse.id) setDrillCourse({ ...drillCourse, ...c });
      }
      setCourseModal(null);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteCourse = (c: OrgCourse) => {
    Alert.alert('Delete', `Delete "${c.Name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteCourse(c.id); setCourses(prev => prev.filter(x => x.id !== c.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  // ── Subject CRUD ─────────────────────────────────────────────────────────────
  const openAddSubject = () => {
    setSubjectForm({ ...SUBJECT_FORM_INIT });
    setSelSubject(null);
    setSubjectModal('add');
  };
  const openEditSubject = (s: OrgSubject) => {
    setSelSubject(s);
    setSubjectForm({ name: s.name || '', Description: s.Description || '', Teacher_id: String(s.Teacher_id ?? ''), price: String(s.price ?? ''), isPaid: s.isPaid ?? false });
    setSubjectModal('edit');
  };
  const handleSaveSubject = async () => {
    if (!drillCourse) return;
    if (!subjectForm.name.trim()) { Alert.alert('Validation', 'Subject name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: subjectForm.name,
        Description: subjectForm.Description || undefined,
        ...(subjectForm.Teacher_id ? { Teacher_id: Number(subjectForm.Teacher_id) } : {}),
        ...(subjectForm.price ? { price: parseFloat(subjectForm.price), isPaid: true } : { isPaid: false }),
      };
      if (subjectModal === 'add') {
        const s = await createSubject(drillCourse.id, payload);
        setSubjects(prev => [...prev, s]);
      } else if (selSubject) {
        const s = await updateSubject(drillCourse.id, selSubject.id, payload);
        setSubjects(prev => prev.map(x => x.id === selSubject.id ? { ...x, ...s } : x));
      }
      setSubjectModal(null);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteSubject = (s: OrgSubject) => {
    if (!drillCourse) return;
    Alert.alert('Delete', `Delete subject "${s.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteSubject(drillCourse.id, s.id); setSubjects(prev => prev.filter(x => x.id !== s.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  if (loading) return <LoadingState message="Loading courses…" />;

  // ── Subject list view (drill-down) ──────────────────────────────────────────
  if (drillCourse) {
    return (
      <>
        <View style={[styles.root, { backgroundColor: T.background }]}>
          {/* Back bar */}
          <View style={[styles.backBar, { borderBottomColor: T.border }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setDrillCourse(null)}>
              <ChevronLeft size={20} color={T.primary} />
              <Text style={[styles.backText, { color: T.primary }]}>Courses</Text>
            </TouchableOpacity>
            <Text style={[styles.drillTitle, { color: T.text }]} numberOfLines={1}>{drillCourse.Name}</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAddSubject}>
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {subLoading ? <LoadingState message="Loading subjects…" /> : (
            <FlatList
              data={subjects}
              keyExtractor={s => String(s.id)}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
              ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
              ListEmptyComponent={<EmptyState emoji="📚" title="No subjects yet" subtitle="Add subjects to this course." />}
              renderItem={({ item: s }) => (
                <View style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}>
                  <View style={[styles.subIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                    <Layers size={18} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: T.text }]}>{s.name}</Text>
                    {s.teacher && (
                      <Text style={[styles.sub, { color: T.muted }]}>
                        {s.teacher.firstName} {s.teacher.lastName}
                      </Text>
                    )}
                    {s.lessonsCount !== undefined && (
                      <Text style={[styles.sub, { color: T.muted }]}>{s.lessonsCount} lesson(s)</Text>
                    )}
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEditSubject(s)} style={styles.actionBtn}>
                      <Edit2 size={16} color={T.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSubject(s)} style={styles.actionBtn}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Subject Modal */}
        <Modal visible={!!subjectModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modal, { backgroundColor: T.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: T.text }]}>
                {subjectModal === 'add' ? 'Add Subject' : 'Edit Subject'}
              </Text>
              <TouchableOpacity onPress={() => setSubjectModal(null)}>
                <X size={22} color={T.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {([
                { key: 'name', label: 'Subject Name *', placeholder: 'e.g. Mathematics' },
                { key: 'Description', label: 'Description', placeholder: 'Short description', multiline: true },
                { key: 'price', label: 'Price (leave blank for free)', placeholder: '0.00', keyboardType: 'decimal-pad' },
              ] as const).map(({ key, label, placeholder, multiline, keyboardType }: { key: string; label: string; placeholder: string; multiline?: boolean; keyboardType?: string }) => (
                <View key={key} style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }, multiline && { height: 70, textAlignVertical: 'top' }]}
                    value={String((subjectForm as unknown as Record<string, unknown>)[key] ?? '')}
                    onChangeText={v => setSubjectForm(prev => ({ ...prev, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={T.placeholder}
                    multiline={multiline}
                    keyboardType={keyboardType as never ?? 'default'}
                  />
                </View>
              ))}
              {/* Teacher selector */}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>Assign Teacher</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing[1] }}>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, { borderColor: !subjectForm.Teacher_id ? T.primary : T.inputBorder, backgroundColor: !subjectForm.Teacher_id ? T.primary : T.inputBg }]}
                      onPress={() => setSubjectForm(prev => ({ ...prev, Teacher_id: '' }))}
                    >
                      <Text style={{ color: !subjectForm.Teacher_id ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>None</Text>
                    </TouchableOpacity>
                    {teachers.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.chip, { borderColor: subjectForm.Teacher_id === String(t.id) ? T.primary : T.inputBorder, backgroundColor: subjectForm.Teacher_id === String(t.id) ? T.primary : T.inputBg }]}
                        onPress={() => setSubjectForm(prev => ({ ...prev, Teacher_id: String(t.id) }))}
                      >
                        <Text style={{ color: subjectForm.Teacher_id === String(t.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t.firstName} {t.lastName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
              <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setSubjectModal(null)}>
                <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleSaveSubject} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Save</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ── Course list view ─────────────────────────────────────────────────────────
  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        <View style={styles.toolbar}>
          <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <Search size={16} color={T.muted} />
            <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder={`Search ${isSchool ? 'classes' : 'courses'}…`} placeholderTextColor={T.placeholder} />
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAddCourse}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={visibleCourses}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="📂" title={`No ${isSchool ? 'classes' : 'courses'} yet`} subtitle="Create your first course." />}
          renderItem={({ item: c }) => (
            <TouchableOpacity style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]} onPress={() => openCourse(c)} activeOpacity={0.8}>
              <View style={[styles.subIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <BookOpen size={20} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: T.text }]}>{c.Name}</Text>
                {isSchool && c.GradeLevel !== null && c.GradeLevel !== undefined && (
                  <Text style={[styles.badge, { color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)' }]}>{formatGradeName(c.GradeLevel)}</Text>
                )}
                {c.teacher && <Text style={[styles.sub, { color: T.muted }]}>{c.teacher.firstName} {c.teacher.lastName}</Text>}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEditCourse(c)} style={styles.actionBtn}>
                  <Edit2 size={16} color={T.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteCourse(c)} style={styles.actionBtn}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
                <ChevronRight size={16} color={T.muted} />
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Course Modal */}
      <Modal visible={!!courseModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>{courseModal === 'add' ? `Add ${isSchool ? 'Class' : 'Course'}` : 'Edit'}</Text>
            <TouchableOpacity onPress={() => setCourseModal(null)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { key: 'Name', label: `${isSchool ? 'Class' : 'Course'} Name *`, placeholder: 'Enter name' },
              { key: 'Description', label: 'Description', placeholder: 'Short description', multiline: true },
              ...(isSchool ? [{ key: 'GradeLevel', label: 'Grade Level', placeholder: 'e.g. 1', keyboardType: 'number-pad' }] : [{ key: 'level', label: 'Level', placeholder: 'e.g. Beginner' }]),
              { key: 'Start', label: 'Start Date (YYYY-MM-DD)', placeholder: '2025-09-01' },
              { key: 'End', label: 'End Date (YYYY-MM-DD)', placeholder: '2026-06-30' },
              { key: 'price', label: 'Price (leave blank for free)', placeholder: '0.00', keyboardType: 'decimal-pad' },
            ].map(({ key, label, placeholder, multiline, keyboardType }: { key: string; label: string; placeholder: string; multiline?: boolean; keyboardType?: string }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }, multiline && { height: 70, textAlignVertical: 'top' }]}
                  value={String((courseForm as unknown as Record<string, unknown>)[key] ?? '')}
                  onChangeText={v => setCourseForm(prev => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={T.placeholder}
                  multiline={multiline}
                  keyboardType={keyboardType as never ?? 'default'}
                />
              </View>
            ))}
            {/* Teacher selector */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Assign Teacher</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing[1] }}>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, { borderColor: !courseForm.Teacher_id ? T.primary : T.inputBorder, backgroundColor: !courseForm.Teacher_id ? T.primary : T.inputBg }]}
                    onPress={() => setCourseForm(prev => ({ ...prev, Teacher_id: '' }))}
                  >
                    <Text style={{ color: !courseForm.Teacher_id ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>None</Text>
                  </TouchableOpacity>
                  {teachers.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.chip, { borderColor: courseForm.Teacher_id === String(t.id) ? T.primary : T.inputBorder, backgroundColor: courseForm.Teacher_id === String(t.id) ? T.primary : T.inputBg }]}
                      onPress={() => setCourseForm(prev => ({ ...prev, Teacher_id: String(t.id) }))}
                    >
                      <Text style={{ color: courseForm.Teacher_id === String(t.id) ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>{t.firstName} {t.lastName}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setCourseModal(null)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleSaveCourse} disabled={saving}>
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
  toolbar:     { flexDirection: 'row', gap: spacing[3], padding: spacing[4], paddingBottom: spacing[2] },
  searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput: { flex: 1, fontSize: fontSize.sm },
  addBtn:      { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  backBar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, gap: spacing[2] },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  drillTitle:  { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  list:        { padding: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[10] },
  row:         { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  subIcon:     { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  name:        { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sub:         { fontSize: fontSize.xs, marginTop: 2 },
  badge:       { alignSelf: 'flex-start', fontSize: 10, fontWeight: '700', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  actions:     { flexDirection: 'row', gap: spacing[1], alignItems: 'center' },
  actionBtn:   { padding: spacing[2] },
  chipRow:     { flexDirection: 'row', gap: spacing[2], paddingBottom: spacing[1] },
  chip:        { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 999, borderWidth: 1 },
  modal:       { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:   { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:       { gap: spacing[1] },
  fieldLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:       { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  modalFooter: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
