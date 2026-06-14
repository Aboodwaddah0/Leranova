import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { UserPlus, Search, Edit2, Trash2, X, Save, BookOpen, Users } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState, Avatar, CredentialsModal } from '../../../shared/components';
import {
  fetchUsers, createUser, updateUser, deleteUser,
  fetchCourses, enrollStudent, unenrollStudent, fetchStudentEnrollments,
} from '../services/organizationService';
import type { OrgUser, OrgCourse } from '../../../types/organization';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', gender: 'MALE', address: '', phone: '', dob: '', fatherName: '' };

interface Props { orgType: 'SCHOOL' | 'ACADEMY'; }

export function OrgStudentsTab({ orgType }: Props) {
  const { T } = useTheme();
  const isSchool = orgType === 'SCHOOL';

  const [students,   setStudents]   = useState<OrgUser[]>([]);
  const [courses,    setCourses]    = useState<OrgCourse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState<'add' | 'edit' | null>(null);
  const [selected,   setSelected]   = useState<OrgUser | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [credentials, setCredentials] = useState<{ name: string; email: string | null; password: string | null } | null>(null);

  // Enrollment modal
  const [enrollModal, setEnrollModal] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<OrgUser | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<{ courseId: number; courseName?: string }[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        fetchUsers({ role: 'STUDENT' }),
        fetchCourses().catch(() => []),
      ]);
      setStudents(s);
      setCourses(c);
    } catch {
      Alert.alert('Error', 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.registrationNumber ?? '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setSelected(null); setModal('add'); };
  const openEdit = (s: OrgUser) => {
    setSelected(s);
    setForm({ firstName: s.firstName, lastName: s.lastName, email: s.email || '', password: '', gender: s.gender || 'MALE', address: s.address || '', phone: s.phone || '', dob: s.dob ? String(s.dob).slice(0,10) : '', fatherName: s.fatherName || '' });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { Alert.alert('Validation', 'Name is required.'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        const { password, ...rest } = form;
        const payload: Record<string, unknown> = { ...rest, role: 'STUDENT' };
        if (!payload.email) delete payload.email;
        const res = await createUser(payload);
        await load();
        setCredentials({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: res.email || null,
          password: res.tempPassword || null,
        });
      } else if (modal === 'edit' && selected) {
        const { password, email, ...rest } = form;
        const payload: Record<string, unknown> = { ...rest };
        if (password.trim()) payload.password = password;
        const updated = await updateUser(selected.id, payload);
        setStudents(prev => prev.map(x => x.id === selected.id ? { ...x, ...updated } : x));
        Alert.alert('Success', 'Student updated.');
      }
      setModal(null);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (s: OrgUser) => {
    Alert.alert('Delete', `Delete student ${s.firstName} ${s.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteUser(s.id); setStudents(prev => prev.filter(x => x.id !== s.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  const openEnrollment = async (s: OrgUser) => {
    setEnrollTarget(s);
    setEnrollModal(true);
    setEnrollLoading(true);
    const data = await fetchStudentEnrollments(s.id).catch(() => []);
    setStudentEnrollments(data);
    setEnrollLoading(false);
  };

  const handleEnroll = async (courseId: number) => {
    if (!enrollTarget) return;
    const already = studentEnrollments.find(e => e.courseId === courseId);
    try {
      if (already) {
        await unenrollStudent(enrollTarget.id, courseId);
        setStudentEnrollments(prev => prev.filter(e => e.courseId !== courseId));
      } else {
        await enrollStudent(enrollTarget.id, courseId, isSchool);
        const course = courses.find(c => c.id === courseId);
        setStudentEnrollments(prev => [...prev, { courseId, courseName: course?.Name }]);
      }
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Enrollment failed.');
    }
  };

  if (loading) return <LoadingState message="Loading students…" />;

  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        <View style={styles.toolbar}>
          <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <Search size={16} color={T.muted} />
            <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder="Search students…" placeholderTextColor={T.placeholder} />
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAdd}>
            <UserPlus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.countRow}>
          <Users size={14} color={T.muted} />
          <Text style={[styles.countText, { color: T.muted }]}>{visible.length} student{visible.length !== 1 ? 's' : ''}</Text>
        </View>

        <FlatList
          data={visible}
          keyExtractor={s => String(s.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="🎓" title="No students yet" subtitle={search ? 'No students match.' : 'Add your first student.'} />}
          renderItem={({ item: s }) => (
            <View style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Avatar size={44} uri={s.avatarUrl} name={`${s.firstName ?? ''} ${s.lastName ?? ''}`} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: T.text }]}>{s.firstName} {s.lastName}</Text>
                {!!s.email && <Text style={[styles.sub, { color: T.muted }]}>{s.email}</Text>}
                {!!s.registrationNumber && <Text style={[styles.sub, { color: T.muted }]}>#{s.registrationNumber}</Text>}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEnrollment(s)} style={styles.actionBtn}>
                  <BookOpen size={16} color={T.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(s)} style={styles.actionBtn}>
                  <Edit2 size={16} color={T.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(s)} style={styles.actionBtn}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={!!modal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>{modal === 'add' ? 'Add Student' : 'Edit Student'}</Text>
            <TouchableOpacity onPress={() => setModal(null)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {modal === 'add' && (
              <View style={[styles.infoBox, { backgroundColor: T.elevated }]}>
                <Text style={[styles.infoText, { color: T.muted }]}>
                  Login credentials will be generated automatically and shown after the student is created.
                </Text>
              </View>
            )}
            {[
              { key: 'firstName', label: 'First Name *', placeholder: 'First name' },
              { key: 'lastName', label: 'Last Name *', placeholder: 'Last name' },
              { key: 'email', label: modal === 'add' ? 'Email (optional)' : 'Email', placeholder: 'student@example.com', keyboardType: 'email-address' },
              ...(modal === 'edit' ? [
                { key: 'password', label: 'New Password', placeholder: 'Password', secure: true },
              ] : []),
              { key: 'phone', label: 'Phone', placeholder: 'Phone number', keyboardType: 'phone-pad' },
              { key: 'dob', label: 'Date of Birth (YYYY-MM-DD)', placeholder: '2010-05-15' },
              { key: 'address', label: 'Address', placeholder: 'Home address' },
              ...(isSchool ? [{ key: 'fatherName', label: "Father's Name", placeholder: "Father's full name" }] : []),
            ].map(({ key, label, placeholder, keyboardType, secure, multiline }: { key: string; label: string; placeholder: string; keyboardType?: string; secure?: boolean; multiline?: boolean }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                  value={(form as Record<string, string>)[key] ?? ''}
                  onChangeText={v => setForm(prev => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={T.placeholder}
                  keyboardType={keyboardType as never ?? 'default'}
                  secureTextEntry={secure}
                  autoCapitalize={key === 'email' ? 'none' : 'sentences'}
                />
              </View>
            ))}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Gender</Text>
              <View style={styles.genderRow}>
                {['MALE', 'FEMALE'].map(g => (
                  <TouchableOpacity key={g}
                    style={[styles.genderBtn, { borderColor: form.gender === g ? T.primary : T.inputBorder, backgroundColor: form.gender === g ? T.primary : T.inputBg }]}
                    onPress={() => setForm(prev => ({ ...prev, gender: g }))}
                  >
                    <Text style={{ color: form.gender === g ? '#fff' : T.muted, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{g}</Text>
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

      {/* Enrollment Modal */}
      <Modal visible={enrollModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>
              {enrollTarget ? `${enrollTarget.firstName}'s Enrollment` : 'Enrollment'}
            </Text>
            <TouchableOpacity onPress={() => setEnrollModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          {enrollLoading ? <LoadingState message="Loading enrollments…" /> : (
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: T.muted }]}>Tap a course to enroll or unenroll</Text>
              {courses.map(c => {
                const enrolled = !!studentEnrollments.find(e => e.courseId === c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.enrollRow, { backgroundColor: enrolled ? 'rgba(16,185,129,0.08)' : T.surface, borderColor: enrolled ? '#10b981' : T.border }]}
                    onPress={() => handleEnroll(c.id)}
                  >
                    <BookOpen size={16} color={enrolled ? '#10b981' : T.muted} />
                    <Text style={[styles.enrollName, { color: T.text }]} numberOfLines={1}>{c.Name}</Text>
                    <View style={[styles.enrollBadge, { backgroundColor: enrolled ? '#10b981' : T.elevated }]}>
                      <Text style={{ color: enrolled ? '#fff' : T.muted, fontSize: 10, fontWeight: '700' }}>
                        {enrolled ? 'ENROLLED' : 'ENROLL'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      <CredentialsModal
        visible={!!credentials}
        onClose={() => setCredentials(null)}
        name={credentials?.name}
        email={credentials?.email}
        password={credentials?.password}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  toolbar:     { flexDirection: 'row', gap: spacing[3], padding: spacing[4], paddingBottom: spacing[2] },
  searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing[3], height: 44 },
  searchInput: { flex: 1, fontSize: fontSize.sm },
  addBtn:      { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  countRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  countText:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  list:        { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[10] },
  row:         { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  name:        { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sub:         { fontSize: fontSize.xs, marginTop: 2 },
  actions:     { flexDirection: 'row', gap: spacing[1] },
  actionBtn:   { padding: spacing[2] },
  modal:       { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:   { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:       { gap: spacing[1] },
  fieldLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:       { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  infoBox:     { borderRadius: radius.lg, padding: spacing[3] },
  infoText:    { fontSize: fontSize.xs, lineHeight: 18 },
  genderRow:   { flexDirection: 'row', gap: spacing[3] },
  genderBtn:   { flex: 1, paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1, alignItems: 'center' },
  modalFooter: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  enrollRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1.5 },
  enrollName:  { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  enrollBadge: { paddingHorizontal: spacing[3], paddingVertical: 4, borderRadius: 999 },
});
