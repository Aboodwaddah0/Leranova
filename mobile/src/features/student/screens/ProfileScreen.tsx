import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Edit2, Key, BookOpen, Trophy, Flame, X, Sun, Moon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Card, Avatar, Separator, Button } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import {
  fetchStudentProfile, updateStudentProfile,
  changeStudentPassword, fetchGamificationStats,
} from '../services/studentService';
import { useAppDispatch } from '../../../store/hooks';
import { logout, updateUser } from '../../../store/authSlice';
import type { StudentProfile, GamificationStats } from '../../../types/student';

export function StudentProfileScreen() {
  const { T, isDark, toggleTheme }  = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats,   setStats]   = useState<GamificationStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile modal
  const [showEdit,  setShowEdit]  = useState(false);
  const [editName,  setEditName]  = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving,    setSaving]    = useState(false);

  // Change Password modal
  const [showPwd,    setShowPwd]    = useState(false);
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError,   setPwdError]   = useState('');
  const [pwdSaving,  setPwdSaving]  = useState(false);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([fetchStudentProfile(), fetchGamificationStats()]);
    setProfile(p);
    setStats(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openEdit = () => {
    setEditName(profile?.fullName ?? '');
    setEditPhone(profile?.phone ?? '');
    setShowEdit(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const updated = await updateStudentProfile({ fullName: editName.trim(), phone: editPhone.trim() });
      if (updated) {
        setProfile(updated);
        dispatch(updateUser({ name: updated.fullName }));
      }
      setShowEdit(false);
    } finally {
      setSaving(false);
    }
  };

  const openPwd = () => {
    setNewPwd('');
    setConfirmPwd('');
    setPwdError('');
    setShowPwd(true);
  };

  const handleChangePassword = async () => {
    if (!newPwd.trim()) { setPwdError('Enter a new password'); return; }
    if (newPwd.length < 6) { setPwdError('Password must be at least 6 characters'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match'); return; }
    setPwdSaving(true);
    setPwdError('');
    try {
      await changeStudentPassword(newPwd);
      setShowPwd(false);
    } catch (e: unknown) {
      setPwdError((e as Error)?.message ?? 'Failed to change password');
    } finally {
      setPwdSaving(false);
    }
  };

  const handleLogout = () => { dispatch(logout()); };

  const inputStyle = [
    styles.input,
    { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text },
  ];

  return (
    <>
      <ScrollView
        style={{ backgroundColor: T.background }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ['#5b21b6', '#0f172a', '#312e81'] : ['#6d28d9', '#7c3aed']}
          style={[styles.hero, { paddingTop: insets.top + spacing[4] }]}
        >
          <Avatar name={profile?.fullName} uri={profile?.avatarUrl} size={80} />
          <Text style={styles.heroName}>{profile?.fullName ?? 'Student'}</Text>
          <Text style={styles.heroEmail}>{profile?.email ?? ''}</Text>

          {stats && (
            <View style={styles.statsRow}>
              {[
                { label: 'Level',  value: stats.level,         icon: Trophy },
                { label: 'XP',     value: stats.totalXp,       icon: BookOpen },
                { label: 'Streak', value: stats.currentStreak, icon: Flame },
              ].map((item) => (
                <View key={item.label} style={styles.statItem}>
                  <item.icon size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.statVal}>{item.value}</Text>
                  <Text style={styles.statLbl}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {/* Info */}
          <Card style={styles.infoCard}>
            <InfoRow label="Full Name" value={profile?.fullName ?? '—'} T={T} />
            <Separator marginV={spacing[3]} />
            <InfoRow label="Email"     value={profile?.email    ?? '—'} T={T} />
            <Separator marginV={spacing[3]} />
            <InfoRow label="Phone"     value={profile?.phone    ?? '—'} T={T} />
          </Card>

          {/* Actions */}
          <Card style={styles.actionsCard}>
            <ActionRow label="Edit Profile"    icon={Edit2} color="#6366f1" onPress={openEdit}  T={T} />
            <Separator marginV={spacing[2]} />
            <ActionRow label="Change Password" icon={Key}   color="#8b5cf6" onPress={openPwd}   T={T} />
            <Separator marginV={spacing[2]} />
            <ActionRow
              label={isDark ? 'Switch to Light' : 'Switch to Dark'}
              icon={isDark ? Sun : Moon}
              color={isDark ? '#f59e0b' : '#6366f1'}
              onPress={toggleTheme}
              T={T}
            />
          </Card>

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.85}>
            <View style={[styles.logoutBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }]}>
              <LogOut size={18} color="#f87171" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal ───────────────────────────────────────── */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: T.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: T.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <X size={20} color={T.muted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: T.muted }]}>Full Name</Text>
            <TextInput
              style={inputStyle}
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
              placeholderTextColor={T.placeholder}
            />

            <Text style={[styles.label, { color: T.muted, marginTop: spacing[3] }]}>Phone</Text>
            <TextInput
              style={inputStyle}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+962..."
              placeholderTextColor={T.placeholder}
              keyboardType="phone-pad"
            />

            <Button
              label="Save Changes"
              onPress={handleSaveProfile}
              loading={saving}
              fullWidth
              style={{ marginTop: spacing[5] }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Change Password Modal ────────────────────────────────────── */}
      <Modal visible={showPwd} transparent animationType="slide" onRequestClose={() => setShowPwd(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: T.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: T.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPwd(false)}>
                <X size={20} color={T.muted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: T.muted }]}>New Password</Text>
            <TextInput
              style={inputStyle}
              value={newPwd}
              onChangeText={setNewPwd}
              placeholder="Min 6 characters"
              placeholderTextColor={T.placeholder}
              secureTextEntry
            />

            <Text style={[styles.label, { color: T.muted, marginTop: spacing[3] }]}>Confirm Password</Text>
            <TextInput
              style={inputStyle}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder="Repeat password"
              placeholderTextColor={T.placeholder}
              secureTextEntry
            />

            {!!pwdError && (
              <Text style={styles.errorText}>{pwdError}</Text>
            )}

            <Button
              label="Update Password"
              onPress={handleChangePassword}
              loading={pwdSaving}
              fullWidth
              style={{ marginTop: spacing[5] }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function InfoRow({ label, value, T }: { label: string; value: string; T: ReturnType<typeof useTheme>['T'] }) {
  return (
    <View>
      <Text style={[styles.infoLabel, { color: T.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: T.text }]}>{value}</Text>
    </View>
  );
}

function ActionRow({
  label, icon: Icon, color, onPress, T,
}: {
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  onPress: () => void;
  T: ReturnType<typeof useTheme>['T'];
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.actionRow} activeOpacity={0.7}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: T.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
    gap: spacing[2],
    borderBottomLeftRadius:  radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  heroName:  { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: spacing[2] },
  heroEmail: { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.sm },
  statsRow:  { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4], width: '100%' },
  statItem:  {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg, padding: spacing[3],
    alignItems: 'center', gap: 2,
  },
  statVal:  { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  statLbl:  { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.xs },

  body: { padding: spacing[5], gap: spacing[4] },

  infoCard:    {},
  infoLabel:   { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 0.5, marginBottom: 3, textTransform: 'uppercase' },
  infoValue:   { fontSize: fontSize.base },

  actionsCard: {},
  actionRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[1] },
  actionIcon:  { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.base, fontWeight: fontWeight.medium },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  logoutText: { color: '#f87171', fontSize: fontSize.base, fontWeight: fontWeight.bold },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    borderTopLeftRadius:  radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] },
  modalTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  label:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing[1] },
  input:  { height: 50, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], fontSize: fontSize.base },
  errorText: { color: '#f87171', fontSize: fontSize.sm, marginTop: spacing[2] },
});
