import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Clipboard } from 'react-native';
import { Copy, Check, X, KeyRound } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, fontSize, fontWeight } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  name?: string;
  email?: string | null;
  password?: string | null;
}

export function CredentialsModal({ visible, onClose, name, email, password }: Props) {
  const { T } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (key: string, value: string) => {
    Clipboard.setString(value);
    setCopied(key);
    setTimeout(() => setCopied(prev => (prev === key ? null : prev)), 2000);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.header}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <KeyRound size={18} color="#6366f1" />
            </View>
            <Text style={[styles.title, { color: T.text }]}>Account Created</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={T.muted} />
            </TouchableOpacity>
          </View>

          {!!name && <Text style={[styles.name, { color: T.text }]}>{name}</Text>}
          <Text style={[styles.hint, { color: T.muted }]}>
            Save these login details — the password won&apos;t be shown again.
          </Text>

          {!!email && (
            <View style={[styles.row, { borderColor: T.border, backgroundColor: T.inputBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: T.muted }]}>Email</Text>
                <Text style={[styles.value, { color: T.text }]} selectable numberOfLines={1}>{email}</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copy('email', email)}>
                {copied === 'email' ? <Check size={16} color="#10b981" /> : <Copy size={16} color={T.primary} />}
              </TouchableOpacity>
            </View>
          )}

          {!!password && (
            <View style={[styles.row, { borderColor: T.border, backgroundColor: T.inputBg }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: T.muted }]}>Password</Text>
                <Text style={[styles.value, { color: T.text }]} selectable numberOfLines={1}>{password}</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copy('password', password)}>
                {copied === 'password' ? <Check size={16} color="#10b981" /> : <Copy size={16} color={T.primary} />}
              </TouchableOpacity>
            </View>
          )}

          {!!email && !!password && (
            <TouchableOpacity
              style={[styles.copyAllBtn, { backgroundColor: T.primary }]}
              onPress={() => copy('both', `Email: ${email}\nPassword: ${password}`)}
            >
              <Copy size={16} color="#fff" />
              <Text style={styles.copyAllText}>{copied === 'both' ? 'Copied!' : 'Copy Both'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: T.elevated }]} onPress={onClose}>
            <Text style={[styles.doneText, { color: T.muted }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing[5] },
  card:       { width: '100%', maxWidth: 400, borderRadius: radius['2xl'], borderWidth: 1, padding: spacing[5], gap: spacing[3] },
  header:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  iconBg:     { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  title:      { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  name:       { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  hint:       { fontSize: fontSize.xs, lineHeight: 18 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  label:      { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  value:      { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 2 },
  copyBtn:    { padding: spacing[2] },
  copyAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.lg },
  copyAllText:{ color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  doneBtn:    { alignItems: 'center', paddingVertical: spacing[3], borderRadius: radius.lg },
  doneText:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
