import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Eye, EyeOff, KeyRound, BookOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';
import { authService } from '../services/authService';
import type { AuthStackParamList } from '../../../types/navigation';

type Nav   = NativeStackNavigationProp<AuthStackParamList>;
type Route = RouteProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const { T, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();
  const route  = useRoute<Route>();
  const { email } = route.params;

  // 6 individual digit boxes
  const [digits,    setDigits]    = useState(['', '', '', '', '', '']);
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleDigit = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await authService.forgotPasswordCode(email);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend. Please try again.');
    }
  };

  const handleSubmit = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit code.'); return; }
    if (!password)        { setError('Please enter a new password.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      await authService.resetPasswordWithCode(code, password);
      setSuccess(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <LinearGradient
        colors={isDark ? ['#0d0c22', '#1a1836', '#0d0c22'] : ['#f5f3ff', '#ede9fe', '#f5f3ff']}
        style={[styles.container, { paddingTop: insets.top + spacing[8] }]}
      >
        <View style={[styles.card, { backgroundColor: isDark ? '#111029' : '#fff', borderColor: T.border, alignItems: 'center' }]}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={[styles.title, { color: T.text, marginTop: spacing[4] }]}>Password Reset!</Text>
          <Text style={[styles.subtitle, { color: T.muted }]}>Your password has been updated successfully.</Text>
          <TouchableOpacity onPress={() => nav.navigate('Login')} activeOpacity={0.85} style={{ marginTop: spacing[6], width: '100%' }}>
            <LinearGradient colors={['#6366f1', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sendBtn}>
              <Text style={styles.sendBtnText}>Back to Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

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
              <KeyRound size={28} color="#6366f1" />
            </View>

            <Text style={[styles.title, { color: T.text }]}>Enter Reset Code</Text>
            <Text style={[styles.subtitle, { color: T.muted }]}>
              We sent a 6-digit code to{'\n'}
              <Text style={{ color: T.primary, fontWeight: fontWeight.bold }}>{email}</Text>
            </Text>

            {!!error && (
              <View style={[styles.errBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: '#f87171' }]}>
                <Text style={styles.errText}>{error}</Text>
              </View>
            )}

            {/* 6-digit boxes */}
            <View style={styles.codeRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={r => { inputRefs.current[i] = r; }}
                  style={[
                    styles.codeBox,
                    { backgroundColor: T.inputBg, borderColor: d ? T.primary : T.inputBorder, color: T.text },
                  ]}
                  value={d}
                  onChangeText={v => handleDigit(v, i)}
                  onKeyPress={e => handleKeyPress(e, i)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleResend} style={styles.resendLink}>
              <Text style={[styles.resendText, { color: T.primary }]}>Didn't receive it? Resend code</Text>
            </TouchableOpacity>

            {/* New password */}
            <Text style={[styles.label, { color: T.subtext }]}>New Password</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, styles.passInput, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={T.placeholder}
                secureTextEntry={!showPass}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                {showPass ? <EyeOff size={18} color={T.muted} /> : <Eye size={18} color={T.muted} />}
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: T.subtext }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.text }]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat new password"
              placeholderTextColor={T.placeholder}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {/* Submit */}
            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={{ marginTop: spacing[5], width: '100%' }}>
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.sendBtn, loading && { opacity: 0.6 }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.sendBtnText}>Reset Password</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  inner:       { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  backBtn:     { marginBottom: spacing[4], width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logoRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginBottom: spacing[6] },
  logoIcon:    { width: 48, height: 48, borderRadius: radius.xl, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  logoText:    { fontSize: fontSize['2xl'], fontWeight: fontWeight.extrabold },
  card:        { borderRadius: radius['2xl'], padding: spacing[6], borderWidth: 1, alignItems: 'center' },
  iconCircle:  { width: 68, height: 68, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4] },
  title:       { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, marginBottom: spacing[2], textAlign: 'center' },
  subtitle:    { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing[5], lineHeight: 20 },
  errBox:      { width: '100%', borderRadius: radius.md, borderWidth: 1, padding: spacing[3], marginBottom: spacing[4] },
  errText:     { color: '#f87171', fontSize: fontSize.sm },
  codeRow:     { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  codeBox:     { width: 44, height: 54, borderRadius: radius.lg, borderWidth: 2, fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  resendLink:  { marginBottom: spacing[4] },
  resendText:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  label:       { alignSelf: 'flex-start', fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing[1.5], marginTop: spacing[3] },
  passRow:     { position: 'relative', width: '100%' },
  passInput:   { paddingRight: spacing[12] },
  eyeBtn:      { position: 'absolute', right: spacing[4], top: 0, bottom: 0, justifyContent: 'center' },
  input:       { width: '100%', height: 50, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[4], fontSize: fontSize.base },
  sendBtn:     { width: '100%', height: 52, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
});
