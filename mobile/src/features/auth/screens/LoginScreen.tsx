import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, BookOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { login } from '../../../store/authSlice';
import { useTheme } from '../../../shared/hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../../../shared/theme';

export function LoginScreen() {
  const dispatch    = useAppDispatch();
  const { isLoading } = useAppSelector((s) => s.auth);
  const { T, isDark } = useTheme();
  const insets      = useSafeAreaInsets();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    setError('');
    const trimEmail = email.trim();
    if (!trimEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    const result = await dispatch(login({ email: trimEmail, password }));
    if (login.rejected.match(result)) {
      setError(typeof result.payload === 'string' ? result.payload : 'Login failed. Please try again.');
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: T.inputBg, borderColor: T.inputBorder, color: T.inputText },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={isDark ? ['#0d0c22', '#1a1836', '#0d0c22'] : ['#f5f3ff', '#ede9fe', '#f5f3ff']}
        style={[styles.container, { paddingTop: insets.top + spacing[8] }]}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <BookOpen size={28} color="#fff" />
          </View>
          <Text style={[styles.logoText, { color: isDark ? '#fff' : T.primary }]}>Learnova</Text>
        </View>

        <Text style={[styles.tagline, { color: isDark ? 'rgba(255,255,255,0.45)' : T.muted }]}>Your learning, elevated.</Text>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: isDark ? '#111029' : '#ffffff', borderColor: T.border }]}>
          <Text style={[styles.cardTitle, { color: T.text }]}>Sign In</Text>
          <Text style={[styles.cardSub, { color: T.muted }]}>Enter your credentials to continue</Text>

          {error ? (
            <View style={[styles.errBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: '#f87171' }]}>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <Text style={[styles.label, { color: T.subtext }]}>Email / Registration No.</Text>
          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={T.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          {/* Password */}
          <Text style={[styles.label, { color: T.subtext }]}>Password</Text>
          <View style={styles.passRow}>
            <TextInput
              style={[inputStyle, styles.passInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={T.placeholder}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
              {showPass
                ? <EyeOff size={18} color={T.muted} />
                : <Eye size={18} color={T.muted} />
              }
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85} style={{ marginTop: spacing[4] }}>
            <LinearGradient
              colors={['#6366f1', '#4f46e5']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.loginBtn, isLoading && { opacity: 0.6 }]}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Sign In</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: isDark ? 'rgba(255,255,255,0.3)' : T.muted }]}>© 2026 Learnova. All rights reserved.</Text>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[5],
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extrabold,
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  card: {
    borderRadius: radius['2xl'],
    padding: spacing[6],
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing[1],
  },
  cardSub: {
    fontSize: fontSize.sm,
    marginBottom: spacing[5],
  },
  errBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  errText: {
    color: '#f87171',
    fontSize: fontSize.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing[1.5],
    marginTop: spacing[3],
  },
  input: {
    height: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    fontSize: fontSize.base,
  },
  passRow: { position: 'relative' },
  passInput: { paddingRight: spacing[12] },
  eyeBtn: {
    position: 'absolute',
    right: spacing[4],
    top: 0, bottom: 0,
    justifyContent: 'center',
  },
  loginBtn: {
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  footer: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing[8],
  },
});
