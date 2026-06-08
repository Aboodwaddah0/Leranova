import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { User, Lock, Save, Eye, EyeOff, Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useAppDispatch } from '../../../store/hooks';
import { updateUser } from '../../../store/authSlice';
import type { InstructorStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<InstructorStackParamList>;
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { LoadingState } from '../../../shared/components';
import { fetchInstructorProfile, updateInstructorProfile } from '../services/instructorService';
import type { InstructorProfile } from '../../../types/instructor';

interface Props { isSchool: boolean; }

export function InstructorSettingsTab({ isSchool }: Props) {
  const { T } = useTheme();
  const dispatch = useAppDispatch();
  const nav = useNavigation<Nav>();

  const [profile,    setProfile]    = useState<InstructorProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw,      setSavingPw]      = useState(false);

  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', gender: '', address: '', work: '', specialization: '', bio: '',
  });

  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [showCon, setShowCon] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await fetchInstructorProfile();
      setProfile(p);
      setProfileForm({
        firstName: p.firstName ?? '',
        lastName: p.lastName ?? '',
        gender: p.gender ?? '',
        address: p.address ?? '',
        work: p.work ?? '',
        specialization: p.specialization ?? '',
        bio: p.bio ?? '',
      });
    } catch {
      Alert.alert('Error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateInstructorProfile(profileForm);
      setProfile(updated);
      dispatch(updateUser({ name: `${profileForm.firstName} ${profileForm.lastName}` }));
      Alert.alert('Success', 'Profile updated.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!pwForm.password || pwForm.password.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.');
      return;
    }
    if (pwForm.password !== pwForm.confirm) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }
    setSavingPw(true);
    try {
      await updateInstructorProfile({ password: pwForm.password });
      setPwForm({ password: '', confirm: '' });
      Alert.alert('Success', 'Password updated.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Failed to update password.');
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) return <LoadingState message="Loading settings…" />;

  return (
    <ScrollView
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Read-only info */}
      {profile && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.cardTitleRow}>
            <User size={16} color="#6366f1" />
            <Text style={[styles.cardTitle, { color: T.text }]}>Account Info</Text>
          </View>
          {[
            { label: 'Email',        value: profile.email },
            { label: 'Organization', value: profile.organization?.Name },
            { label: 'Org Type',     value: profile.organization?.type ?? profile.studentMode },
          ].filter(r => r.value).map(({ label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: T.muted }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: T.text }]}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Profile form */}
      <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <View style={styles.cardTitleRow}>
          <User size={16} color="#6366f1" />
          <Text style={[styles.cardTitle, { color: T.text }]}>Edit Profile</Text>
        </View>
        {[
          { key: 'firstName',     label: 'First Name',     placeholder: 'First name' },
          { key: 'lastName',      label: 'Last Name',      placeholder: 'Last name' },
          { key: 'gender',        label: 'Gender',         placeholder: 'Male / Female' },
          { key: 'address',       label: 'Address',        placeholder: 'Home address' },
          { key: 'work',          label: 'Work / School',  placeholder: 'Workplace' },
          { key: 'specialization',label: 'Specialization', placeholder: 'e.g. Mathematics' },
          { key: 'bio',           label: 'Bio',            placeholder: 'Short biography', multiline: true },
        ].map(({ key, label, placeholder, multiline }) => (
          <View key={key} style={styles.field}>
            <Text style={[styles.fieldLabel, { color: T.subtext }]}>{label}</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text },
                multiline && { height: 80, textAlignVertical: 'top' },
              ]}
              value={(profileForm as Record<string, string>)[key] ?? ''}
              onChangeText={v => setProfileForm(prev => ({ ...prev, [key]: v }))}
              placeholder={placeholder}
              placeholderTextColor={T.placeholder}
              multiline={multiline}
            />
          </View>
        ))}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: T.primary }]}
          onPress={handleSaveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? <ActivityIndicator size="small" color="#fff" /> : (
            <><Save size={16} color="#fff" /><Text style={styles.saveBtnText}>Save Profile</Text></>
          )}
        </TouchableOpacity>
      </View>

      {/* Notification Test */}
      <TouchableOpacity
        style={[styles.notifTestBtn, { backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }]}
        onPress={() => nav.navigate('NotificationTest')}
        activeOpacity={0.8}
      >
        <Bell size={18} color="#6366f1" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.notifTitle, { color: '#6366f1' }]}>🔔 Test Notifications</Text>
          <Text style={[styles.notifSub, { color: T.muted }]}>Fire fake notifications for Student, Teacher & Org roles</Text>
        </View>
      </TouchableOpacity>

      {/* Password form */}
      <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <View style={styles.cardTitleRow}>
          <Lock size={16} color="#ef4444" />
          <Text style={[styles.cardTitle, { color: T.text }]}>Change Password</Text>
        </View>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: T.subtext }]}>New Password (min 8 chars)</Text>
          <View style={[styles.pwRow, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <TextInput
              style={[styles.pwInput, { color: T.text }]}
              value={pwForm.password}
              onChangeText={v => setPwForm(prev => ({ ...prev, password: v }))}
              placeholder="New password"
              placeholderTextColor={T.placeholder}
              secureTextEntry={!showPw}
            />
            <TouchableOpacity onPress={() => setShowPw(p => !p)} style={styles.eyeBtn}>
              {showPw ? <EyeOff size={16} color={T.muted} /> : <Eye size={16} color={T.muted} />}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: T.subtext }]}>Confirm Password</Text>
          <View style={[styles.pwRow, { backgroundColor: T.inputBg, borderColor: T.inputBorder }]}>
            <TextInput
              style={[styles.pwInput, { color: T.text }]}
              value={pwForm.confirm}
              onChangeText={v => setPwForm(prev => ({ ...prev, confirm: v }))}
              placeholder="Confirm password"
              placeholderTextColor={T.placeholder}
              secureTextEntry={!showCon}
            />
            <TouchableOpacity onPress={() => setShowCon(p => !p)} style={styles.eyeBtn}>
              {showCon ? <EyeOff size={16} color={T.muted} /> : <Eye size={16} color={T.muted} />}
            </TouchableOpacity>
          </View>
          {pwForm.password && pwForm.confirm && pwForm.password !== pwForm.confirm && (
            <Text style={{ color: '#ef4444', fontSize: fontSize.xs, marginTop: 4 }}>Passwords do not match</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: '#ef4444' }]}
          onPress={handleSavePassword}
          disabled={savingPw}
        >
          {savingPw ? <ActivityIndicator size="small" color="#fff" /> : (
            <><Lock size={16} color="#fff" /><Text style={styles.saveBtnText}>Update Password</Text></>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body:          { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  card:          { borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  cardTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  cardTitle:     { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  infoRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  infoLabel:     { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', width: 90 },
  infoValue:     { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  field:         { gap: spacing[1] },
  fieldLabel:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  input:         { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.sm },
  pwRow:         { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, paddingLeft: spacing[4] },
  pwInput:       { flex: 1, paddingVertical: spacing[3], fontSize: fontSize.sm },
  eyeBtn:        { padding: spacing[3] },
  saveBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.xl },
  saveBtnText:   { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  notifTestBtn:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  notifTitle:    { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  notifSub:      { fontSize: fontSize.xs, marginTop: 2 },
});
