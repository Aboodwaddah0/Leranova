import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import {
  Building2, Users, GraduationCap, BookOpen, DollarSign,
  Mail, Phone, MapPin, Calendar, Edit2, Save, X, Bell,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState, EmptyState } from '../../../shared/components';
import type { OrgStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<OrgStackParamList>;
import {
  fetchOrgProfile, updateOrgProfile, fetchTeachers, fetchCourses,
  fetchUsers, fetchRevenue,
} from '../services/organizationService';
import type { OrgProfile } from '../../../types/organization';

interface Props {
  orgType: 'SCHOOL' | 'ACADEMY';
}

export function OrgOverviewTab({ orgType }: Props) {
  const { T } = useTheme();
  const nav = useNavigation<Nav>();
  const isSchool = orgType === 'SCHOOL';

  const [profile,    setProfile]    = useState<OrgProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ teachers: 0, students: 0, courses: 0, revenue: 0 });
  const [editModal,  setEditModal]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({ Name: '', Email: '', Phone: '', Address: '', Description: '' });

  const load = useCallback(async () => {
    try {
      const [prof, teachers, courses, users] = await Promise.all([
        fetchOrgProfile(),
        fetchTeachers().catch(() => []),
        fetchCourses().catch(() => []),
        fetchUsers({ role: 'STUDENT' }).catch(() => []),
      ]);
      setProfile(prof);
      setForm({ Name: prof.Name || '', Email: prof.Email || '', Phone: prof.Phone || '', Address: prof.Address || '', Description: prof.Description || '' });
      setStats({
        teachers: teachers.length,
        courses: courses.length,
        students: users.length,
        revenue: 0,
      });
      fetchRevenue().then(r => setStats(prev => ({ ...prev, revenue: r?.totalRevenue ?? 0 }))).catch(() => {});
    } catch {
      Alert.alert('Error', 'Failed to load organization profile.');
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateOrgProfile(form);
      setProfile(updated);
      setEditModal(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: 'Teachers', value: stats.teachers, icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: isSchool ? 'Classes' : 'Courses', value: stats.courses, icon: BookOpen, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Students', value: stats.students, icon: GraduationCap, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Revenue', value: `$${stats.revenue.toFixed(0)}`, icon: DollarSign, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ];

  if (loading) return <LoadingState message="Loading overview…" />;

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: spacing[10] }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <View key={label} style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={[styles.statIcon, { backgroundColor: bg }]}>
                <Icon size={20} color={color} />
              </View>
              <Text style={[styles.statValue, { color: T.text }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: T.muted }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Profile card */}
        {profile && (
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.orgIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <Building2 size={24} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orgName, { color: T.text }]} numberOfLines={1}>{profile.Name}</Text>
                <Text style={[styles.orgType, { color: '#6366f1' }]}>
                  {isSchool ? 'School Organization' : 'Academy Organization'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: 'rgba(99,102,241,0.12)' }]}
                onPress={() => setEditModal(true)}
              >
                <Edit2 size={16} color="#6366f1" />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: T.border }]} />

            {[
              { icon: Mail,    value: profile.Email,    label: 'Email' },
              { icon: Phone,   value: profile.Phone,    label: 'Phone' },
              { icon: MapPin,  value: profile.Address,  label: 'Address' },
              { icon: Calendar,value: profile.Founded ? String(profile.Founded).slice(0,10) : null, label: 'Founded' },
            ].filter(r => r.value).map(({ icon: Icon, value, label }) => (
              <View key={label} style={styles.infoRow}>
                <Icon size={16} color={T.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: T.muted }]}>{label}</Text>
                  <Text style={[styles.infoValue, { color: T.text }]} numberOfLines={2}>{value}</Text>
                </View>
              </View>
            ))}

            {!!profile.Description && (
              <View style={styles.descBox}>
                <Text style={[styles.descText, { color: T.subtext }]}>{profile.Description}</Text>
              </View>
            )}
          </View>
        )}

        {/* Notification test button */}
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }]}
          onPress={() => nav.navigate('NotificationTest')}
          activeOpacity={0.8}
        >
          <Bell size={18} color="#6366f1" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifTitle, { color: '#6366f1' }]}>🔔 Test Notifications</Text>
            <Text style={[styles.notifSub, { color: T.muted }]}>Fire fake push notifications for Student, Teacher & Org</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: T.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <X size={22} color={T.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { key: 'Name',        label: 'Organization Name', placeholder: 'Enter name' },
              { key: 'Email',       label: 'Email',             placeholder: 'Enter email' },
              { key: 'Phone',       label: 'Phone',             placeholder: 'Enter phone' },
              { key: 'Address',     label: 'Address',           placeholder: 'Enter address' },
              { key: 'Description', label: 'Description',       placeholder: 'Short description', multiline: true },
            ].map(({ key, label, placeholder, multiline }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text },
                    multiline && { height: 80, textAlignVertical: 'top' },
                  ]}
                  value={(form as Record<string, string>)[key] ?? ''}
                  onChangeText={(v) => setForm(prev => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={T.placeholder}
                  multiline={multiline}
                />
              </View>
            ))}
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: T.border }]}>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: T.elevated }]}
              onPress={() => setEditModal(false)}
            >
              <Text style={[styles.footerBtnText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: T.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Save size={16} color="#fff" />
                  <Text style={[styles.footerBtnText, { color: '#fff' }]}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  body:       { padding: spacing[4], gap: spacing[4] },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard:   { flex: 1, minWidth: '42%', borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], alignItems: 'center', gap: spacing[2] },
  statIcon:   { width: 44, height: 44, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  statValue:  { fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold },
  statLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  card:       { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  orgIcon:    { width: 48, height: 48, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  orgName:    { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  orgType:    { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  editBtn:    { padding: spacing[2], borderRadius: radius.lg },
  divider:    { height: 1 },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  infoLabel:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  infoValue:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  descBox:    { padding: spacing[3], borderRadius: radius.lg, backgroundColor: 'rgba(99,102,241,0.06)' },
  notifBtn:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  notifTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  notifSub:   { fontSize: fontSize.xs, marginTop: 2 },
  descText:   { fontSize: fontSize.sm, lineHeight: 20 },
  modal:      { flex: 1 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5], paddingTop: spacing[6] },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  modalBody:  { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  field:      { gap: spacing[1] },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:      { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  modalFooter:{ flexDirection: 'row', gap: spacing[3], padding: spacing[5], borderTopWidth: 1 },
  footerBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  footerBtnText:{ fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
