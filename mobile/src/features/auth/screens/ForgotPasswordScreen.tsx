import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Mail, BookOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { authService } from '../services/authService';
import type { AuthStackParamList } from '../../../types/navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

const ACCOUNT_TYPES = [
  { value: 'USER',         label: 'Teacher / Student / Parent' },
  { value: 'ORGANIZATION', label: 'Organization' },
];

export function ForgotPasswordScreen() {
  const { T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();

  const [email,       setEmail]       = useState('');
  const [accountType, setAccountType] = useState('USER');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('Please enter a valid email address.'); return; }
    setError('');
    setLoading(true);
    try {
      await authService.forgotPasswordCode(trimmed, accountType);
      nav.navigate('ResetPassword', { email: trimmed });
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={isDark ? ['#0d0c22', '#1a1836', '#0d0c22'] : ['#f5f3ff', '#ede9fe', '#f5f3ff']}
        style={[styles.container, { paddingTop: insets.top + spacing[4] }]}
      >
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <ArrowLeft size={20} color={isDark ? '#fff' : T.primary} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <BookOpen size={26} color="#fff" />
            </View>
            <Text style={[styles.logoText, { color: isDark ? '#fff' : T.primary }]}>Learnova</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: isDark ? '#111029' : '#fff', borderColor: T.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Mail size={28} color="#6366f1" />
            </View>

            <Text style={[styles.title, { color: T.text }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { color: T.muted }]}>
              Enter your email and we'll send a 6-digit reset code.
            </Text>

            {!!error && (
              <View style={[styles.errBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: '#f87171' }]}>
                <Text style={styles.errText}>{error}</Text>
              </View>
            )}

            {/* Account type selector */}
            <Text style={[styles.label, { color: T.subtext }]}>Account Type</Text>
            <View style={styles.typeRow}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeBtn,
                    { borderColor: accountType === t.value ? T.primary : T.inputBorder,
                      backgroundColor: accountType === t.value ? T.primary : T.inputBg },
                  ]}
                  onPress={() => setAccountType(t.value)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: accountType === t.value ? '#fff' : T.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Email */}
            <Text style={[styles.label, { color: T.subtext }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={T.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />

            {/* Send button */}
            <TouchableOpacity onPress={handleSend} disabled={loading} activeOpacity={0.85} style={{ marginTop: spacing[5] }}>
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.sendBtn, loading && { opacity: 0.6 }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.sendBtnText}>Send Reset Code</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => nav.goBack()} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: T.primary }]}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  inner:        { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  backBtn:      { marginBottom: spacing[4], width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logoRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginBottom: spacing[6] },
  logoIcon:     { width: 48, height: 48, borderRadius: radius.xl, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  logoText:     { fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold },
  card:         { borderRadius: radius['2xl'], padding: spacing[6], borderWidth: 1, alignItems: 'center' },
  iconCircle:   { width: 68, height: 68, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] },
  title:        { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, marginBottom: spacing[2], textAlign: 'center' },
  subtitle:     { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing[5], lineHeight: 20 },
  errBox:       { width: '100%', borderRadius: radius.md, borderWidth: 1, padding: spacing[3], marginBottom: spacing[4] },
  errText:      { color: '#f87171', fontSize: fontSize.sm },
  label:        { alignSelf: 'flex-start', fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing[1.5], marginTop: spacing[3] },
  typeRow:      { flexDirection: 'row', gap: spacing[2], width: '100%' },
  typeBtn:      { flex: 1, paddingVertical: spacing[3], borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input:        { width: '100%', height: 50, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], fontSize: fontSize.base },
  sendBtn:      { width: '100%', height: 52, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  sendBtnText:  { color: '#fff', fontSize: fontSize.base, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  backLink:     { marginTop: spacing[4] },
  backLinkText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
