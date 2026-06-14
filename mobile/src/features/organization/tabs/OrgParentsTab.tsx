import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { UserPlus, Search, Edit2, Trash2, X, Save, Link2, Users } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState, Avatar } from '../../../shared/components';
import {
  fetchUsers, createUser, updateUser, deleteUser, linkParentToStudents,
} from '../services/organizationService';
import type { OrgUser } from '../../../types/organization';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', address: '' };

interface Props { orgType: 'SCHOOL' | 'ACADEMY'; }

export function OrgParentsTab({ orgType }: Props) {
  const { T } = useTheme();

  const [parents,    setParents]    = useState<OrgUser[]>([]);
  const [students,   setStudents]   = useState<OrgUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState<'add' | 'edit' | null>(null);
  const [selected,   setSelected]   = useState<OrgUser | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);

  // Link modal
  const [linkModal,  setLinkModal]  = useState(false);
  const [linkTarget, setLinkTarget] = useState<OrgUser | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [linking,    setLinking]    = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        fetchUsers({ role: 'PARENT' }),
        fetchUsers({ role: 'STUDENT' }).catch(() => []),
      ]);
      setParents(p);
      setStudents(s);
    } catch {
      Alert.alert('Error', 'Failed to load parents.');
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
    if (!q) return parents;
    return parents.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q)
    );
  }, [parents, search]);

  const filteredStudents = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q));
  }, [students, linkSearch]);

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setSelected(null); setModal('add'); };
  const openEdit = (p: OrgUser) => {
    setSelected(p);
    setForm({ firstName: p.firstName, lastName: p.lastName, email: p.email || '', password: '', address: p.address || '' });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { Alert.alert('Validation', 'Name is required.'); return; }
    if (modal === 'add' && (!form.email.trim() || !form.password.trim())) { Alert.alert('Validation', 'Email and password are required.'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        const created = await createUser({ ...form, role: 'PARENT' });
        const newParent = (created as { user?: OrgUser } & OrgUser).user ?? created as OrgUser;
        if (newParent?.id) setParents(prev => [...prev, newParent]);
        Alert.alert('Success', 'Parent created.');
      } else if (modal === 'edit' && selected) {
        const { password, email, ...rest } = form;
        const payload: Record<string, unknown> = { ...rest };
        if (password.trim()) payload.password = password;
        const updated = await updateUser(selected.id, payload);
        setParents(prev => prev.map(x => x.id === selected.id ? { ...x, ...updated } : x));
        Alert.alert('Success', 'Parent updated.');
      }
      setModal(null);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: OrgUser) => {
    Alert.alert('Delete', `Delete parent ${p.firstName} ${p.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteUser(p.id); setParents(prev => prev.filter(x => x.id !== p.id)); }
        catch { Alert.alert('Error', 'Failed to delete.'); }
      }},
    ]);
  };

  const openLink = (p: OrgUser) => {
    setLinkTarget(p);
    setLinkSearch('');
    setSelectedStudentIds((p.linkedStudents ?? []).map(s => s.id));
    setLinkModal(true);
  };

  const toggleStudent = (id: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleLink = async () => {
    if (!linkTarget) return;
    setLinking(true);
    try {
      await linkParentToStudents(linkTarget.id, selectedStudentIds);
      const updatedStudents = students.filter(s => selectedStudentIds.includes(s.id));
      setParents(prev => prev.map(p => p.id === linkTarget.id ? { ...p, linkedStudents: updatedStudents } : p));
      setLinkModal(false);
      Alert.alert('Success', 'Students linked.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to link.');
    } finally {
      setLinking(false);
    }
  };

  if (loading) return <LoadingState message="Loading parents…" />;

  return (
    <>
      <View style={[styles.root, { backgroundColor: T.background }]}>
        <View style={styles.toolbar}>
          <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <Search size={16} color={T.muted} />
            <TextInput style={[styles.searchInput, { color: T.text }]} value={search} onChangeText={setSearch} placeholder="Search parents…" placeholderTextColor={T.placeholder} />
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.primary }]} onPress={openAdd}>
            <UserPlus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={visible}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          ListEmptyComponent={<EmptyState emoji="👨‍👩‍👧" title="No parents yet" subtitle={search ? 'No parents match.' : 'Add parents to get started.'} />}
          renderItem={({ item: p }) => (
            <View style={[styles.row, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Avatar size={44} uri={p.avatarUrl} name={`${p.firstName ?? ''} ${p.lastName ?? ''}`} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: T.text }]}>{p.firstName} {p.lastName}</Text>
                {!!p.email && <Text style={[styles.sub, { color: T.muted }]}>{p.email}</Text>}
                {(p.linkedStudents ?? []).length > 0 && (
                  <Text style={[styles.sub, { color: '#8b5cf6' }]}>
                    {(p.linkedStudents ?? []).length} linked student(s)
                  </Text>
                )}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openLink(p)} style={styles.actionBtn}>
                  <Link2 size={16} color={T.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(p)} style={styles.actionBtn}>
                  <Edit2 size={16} color={T.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(p)} style={styles.actionBtn}>
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
            <Text style={[styles.modalTitle, { color: T.text }]}>{modal === 'add' ? 'Add Parent' : 'Edit Parent'}</Text>
            <TouchableOpacity onPress={() => setModal(null)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { key: 'firstName', label: 'First Name *', placeholder: 'First name' },
              { key: 'lastName', label: 'Last Name *', placeholder: 'Last name' },
              { key: 'email', label: modal === 'add' ? 'Email *' : 'Email', placeholder: 'email@example.com', keyboardType: 'email-address' },
              { key: 'password', label: modal === 'add' ? 'Password *' : 'New Password', placeholder: 'Password', secure: true },
              { key: 'address', label: 'Address', placeholder: 'Home address' },
            ].map(({ key, label, placeholder, keyboardType, secure }: { key: string; label: string; placeholder: string; keyboardType?: string; secure?: boolean }) => (
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

      {/* Link Students Modal */}
      <Modal visible={linkModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Link Students</Text>
            <TouchableOpacity onPress={() => setLinkModal(false)}><X size={22} color={T.muted} /></TouchableOpacity>
          </View>
          <View style={[styles.searchBoxPad, { borderBottomColor: T.border }]}>
            <View style={[styles.searchBox, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
              <Search size={16} color={T.muted} />
              <TextInput style={[styles.searchInput, { color: T.text }]} value={linkSearch} onChangeText={setLinkSearch} placeholder="Search students…" placeholderTextColor={T.placeholder} />
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {filteredStudents.map(s => {
              const sel = selectedStudentIds.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.linkRow, { backgroundColor: sel ? 'rgba(99,102,241,0.08)' : T.surface, borderColor: sel ? T.primary : T.border }]}
                  onPress={() => toggleStudent(s.id)}
                >
                  <View style={[styles.checkbox, { borderColor: sel ? T.primary : T.inputBorder, backgroundColor: sel ? T.primary : 'transparent' }]}>
                    {sel && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
                  </View>
                  <Text style={[styles.name, { color: T.text, flex: 1 }]}>{s.firstName} {s.lastName}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.elevated }]} onPress={() => setLinkModal(false)}>
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerBtn, { backgroundColor: T.primary }]} onPress={handleLink} disabled={linking}>
              {linking ? <ActivityIndicator size="small" color="#fff" /> : <><Link2 size={16} color="#fff" /><Text style={[styles.footerBtnText, { color: '#fff' }]}>Link ({selectedStudentIds.length})</Text></>}
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
  searchBoxPad: { paddingHorizontal: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1 },
  searchInput:  { flex: 1, fontSize: fontSize.sm },
  addBtn:       { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  list:         { padding: spacing[4], paddingTop: 0, paddingBottom: spacing[10] },
  row:          { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  name:         { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sub:          { fontSize: fontSize.xs, marginTop: 2 },
  actions:      { flexDirection: 'row', gap: spacing[1] },
  actionBtn:    { padding: spacing[2] },
  modal:        { flex: 1 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:    { padding: spacing[5], gap: spacing[3], paddingBottom: spacing[10] },
  field:        { gap: spacing[1] },
  fieldLabel:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:        { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  modalFooter:  { flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  linkRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1.5 },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
