import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput,
  StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Save, LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/hooks/useTheme';
import { Card, Avatar, Button } from '../../../shared/components';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { fetchMyParentProfile, updateMyParentProfile } from '../services/parentService';
import { useAppDispatch } from '../../../store/hooks';
import { logout, updateUser } from '../../../store/authSlice';
import type { ParentProfile } from '../../../types/parent';

export function ParentSettingsScreen() {
  const { T }  = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const [profile,  setProfile]  = useState<ParentProfile | null>(null);
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await fetchMyParentProfile();
    if (p) {
      setProfile(p);
      setName(p.fullName ?? '');
      setPhone(p.phone ?? '');
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
      const updated = await updateMyParentProfile({ fullName: name.trim(), phone: phone.trim() });
      if (updated) {
        setProfile(updated);
        dispatch(updateUser({ name: updated.fullName }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }];

  return (
    <ScrollView
      style={{ backgroundColor: T.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={['#5b21b6', '#0f172a', '#312e81']}
        style={[styles.hero, { paddingTop: insets.top + spacing[4] }]}
      >
        <Avatar name={profile?.fullName} uri={profile?.avatarUrl} size={72} />
        <Text style={styles.heroName}>{profile?.fullName ?? 'Parent'}</Text>
        <Text style={styles.heroEmail}>{profile?.email ?? ''}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Card>
          <Text style={[styles.sectionTitle, { color: T.text }]}>Edit Profile</Text>

          <Text style={[styles.label, { color: T.muted }]}>Full Name</Text>
          <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Full Name" placeholderTextColor={T.placeholder} />

          <Text style={[styles.label, { color: T.muted, marginTop: spacing[3] }]}>Phone</Text>
          <TextInput style={inputStyle} value={phone} onChangeText={setPhone} placeholder="+962..." placeholderTextColor={T.placeholder} keyboardType="phone-pad" />

          <Text style={[styles.label, { color: T.muted, marginTop: spacing[3] }]}>Email (read-only)</Text>
          <TextInput style={[inputStyle, { opacity: 0.6 }]} value={profile?.email ?? ''} editable={false} />

          <Button
            label={saved ? '✓ Saved!' : 'Save Changes'}
            onPress={handleSave}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing[5] }}
          />
        </Card>

        {/* Logout */}
        <TouchableOpacity onPress={() => dispatch(logout())} activeOpacity={0.85}>
          <View style={[styles.logoutBtn, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }]}>
            <LogOut size={18} color="#f87171" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[5], paddingBottom: spacing[6],
    borderBottomLeftRadius:  radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
  },
  heroName:  { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: spacing[2] },
  heroEmail: { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.sm },
  body:         { padding: spacing[5], gap: spacing[4] },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, marginBottom: spacing[4] },
  label:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing[1.5] },
  input:  { height: 50, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], fontSize: fontSize.base },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], padding: spacing[4], borderRadius: radius.xl, borderWidth: 1 },
  logoutText: { color: '#f87171', fontSize: fontSize.base, fontWeight: fontWeight.bold },
});
