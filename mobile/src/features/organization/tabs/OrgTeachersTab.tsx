import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  UserPlus, Search, Edit2, Trash2, X, Save, Mail,
  Phone, User, ChevronRight, Users,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState, Avatar, CredentialsModal } from '../../../shared/components';
import {
  fetchTeachers, createTeacher, updateTeacher, deleteTeacher,
} from '../services/organizationService';
import type { OrgTeacher } from '../../../types/organization';

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', password: '',
  phone: '', specialization: '', gender: 'MALE', bio: '',
};

interface Props {
  orgType: 'SCHOOL' | 'ACADEMY';
}

export function OrgTeachersTab({ orgType }: Props) {
  const { T } = useTheme();

  const [teachers,   setTeachers]   = useState<OrgTeacher[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState<'add' | 'edit' | null>(null);
  const [selected,   setSelected]   = useState<OrgTeacher | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [credentials, setCredentials] = useState<{ name: string; email: string | null; password: string | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchTeachers();
      setTeachers(data);
    } catch {
      Alert.alert('Error', 'Failed to load teachers.');
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
    if (!q) return teachers;
    return teachers.filter(t =>
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      (t.specialization ?? '').toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setSelected(null);
    setModal('add');
  };

  const openEdit = (t: OrgTeacher) => {
    setSelected(t);
    setForm({
      firstName: t.firstName ?? '',
      lastName: t.lastName ?? '',
      email: t.email || '',
      password: '',
      phone: t.phone || '',
      specialization: t.specialization || '',
      gender: t.gender || 'MALE',
      bio: t.bio || '',
    });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Validation', 'First and last name are required.');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'add') {
        if (!form.email.trim()) {
          Alert.alert('Validation', 'Email is required for new teachers.');
          setSaving(false);
          return;
        }
        const created = await createTeacher(form);
        await load();
        setCredentials({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: created.email || form.email,
          password: created.tempPassword || null,
        });
      } else if (modal === 'edit' && selected) {
        const { password, email, ...rest } = form;
        const payload: Record<string, unknown> = { ...rest };
        if (password.trim()) payload.password = password;
        const updated = await updateTeacher(selected.id, payload);
        setTeachers(prev => prev.map(t => t.id === selected.id ? { ...t, ...updated } : t));
        Alert.alert('Success', 'Teacher updated.');
      }
      setModal(null);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (t: OrgTeacher) => {
    Alert.alert(
      'Delete Teacher',
      `Are you sure you want to delete ${t.firstName} ${t.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteTeacher(t.id);
              setTeachers(prev => prev.filter(x => x.id !== t.id));
            } catch {
              Alert.alert('Error', 'Failed to delete teacher.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item: t }: { item: OrgTeacher }) => (
    <View style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Avatar size={44} uri={t.avatarUrl} name={`${t.firstName ?? ''} ${t.lastName ?? ''}`} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: T.text }]}>{t.firstName ?? ''} {t.lastName ?? ''}</Text>
        {!!t.email && <Text style={[styles.sub, { color: T.muted }]}>{t.email}</Text>}
        {!!t.specialization && (
          <Text style={[styles.badge, { color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)' }]}>
            {t.specialization}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(t)} style={styles.actionBtn}>
          <Edit2 size={16} color={T.muted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(t)} style={styles.actionBtn}>
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <LoadingState message="Loading teachers…" />;

  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <Search size={16} color={T.muted} />
            <TextInput
              style={[styles.searchInput, { color: T.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search teachers…"
              placeholderTextColor={T.placeholder}
            />
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAdd}>
            <UserPlus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Count */}
        <View style={styles.countRow}>
          <Users size={14} color={T.muted} />
          <Text style={[styles.countText, { color: T.muted }]}>
            {visible.length} teacher{visible.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <FlatList
          data={visible}
          keyExtractor={t => String(t.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ListEmptyComponent={<EmptyState emoji="👩‍🏫" title="No teachers yet" subtitle={search ? 'No teachers match your search.' : 'Add your first teacher to get started.'} />}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Add / Edit Modal */}
      <Modal visible={!!modal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>
              {modal === 'add' ? 'Add Teacher' : 'Edit Teacher'}
            </Text>
            <TouchableOpacity onPress={() => setModal(null)}>
              <X size={22} color={T.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {modal === 'add' && (
              <View style={[styles.infoBox, { backgroundColor: T.elevated }]}>
                <Text style={[styles.infoText, { color: T.muted }]}>
                  A login password will be generated automatically and shown after the teacher is created.
                </Text>
              </View>
            )}
            {[
              { key: 'firstName', label: 'First Name *', placeholder: 'First name' },
              { key: 'lastName',  label: 'Last Name *',  placeholder: 'Last name' },
              { key: 'email',     label: modal === 'add' ? 'Email *' : 'Email', placeholder: 'Email', keyboardType: 'email-address' },
              ...(modal === 'edit' ? [
                { key: 'password', label: 'New Password (leave blank to keep)', placeholder: 'Password', secure: true },
              ] : []),
              { key: 'phone',     label: 'Phone',    placeholder: 'Phone number', keyboardType: 'phone-pad' },
              { key: 'specialization', label: 'Specialization', placeholder: 'e.g. Mathematics' },
              { key: 'bio',       label: 'Bio', placeholder: 'Short biography', multiline: true },
            ].map(({ key, label, placeholder, keyboardType, secure, multiline }: { key: string; label: string; placeholder: string; keyboardType?: string; secure?: boolean; multiline?: boolean }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text },
                    multiline && { height: 70, textAlignVertical: 'top' },
                  ]}
                  value={(form as Record<string, string>)[key] ?? ''}
                  onChangeText={v => setForm(prev => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={T.placeholder}
                  keyboardType={keyboardType as never ?? 'default'}
                  secureTextEntry={secure}
                  multiline={multiline}
                  autoCapitalize={key === 'email' ? 'none' : 'sentences'}
                />
              </View>
            ))}

            {/* Gender picker */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: T.subtext }]}>Gender</Text>
              <View style={styles.genderRow}>
                {['MALE', 'FEMALE'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderBtn,
                      { borderColor: form.gender === g ? T.primary : T.inputBorder, backgroundColor: form.gender === g ? T.primary : T.inputBg },
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, gender: g }))}
                  >
                    <Text style={{ color: form.gender === g ? '#fff' : T.muted, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                      {g}
                    </Text>
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
              {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                <><Save size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Save</Text></>
              )}
            </TouchableOpacity>
          </View>
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
  badge:       { alignSelf: 'flex-start', fontSize: 10, fontWeight: '700', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  actions:     { flexDirection: 'row', gap: spacing[2] },
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
});
