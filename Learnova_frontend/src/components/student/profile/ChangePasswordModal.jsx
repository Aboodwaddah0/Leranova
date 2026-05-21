import { useMemo, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import { useLanguage } from '../../../utils/i18n';
import { useTheme } from '../../../contexts/ThemeContext';

function PasswordField({ label, value, onChange, visible, onToggle, placeholder, T }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: T.label }}>
        {label}
      </span>
      <div className="relative mt-2">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            borderRadius: '1rem',
            border: `1px solid ${T.inputBorder}`,
            background: T.inputBg,
            color: T.inputText,
            padding: '12px 44px 12px 16px',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
          style={{ color: T.toggleIcon }}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

export default function ChangePasswordModal({ open, onClose, onSave, saving }) {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState('');

  const T = {
    overlay:     isDark ? 'rgba(4,4,20,0.7)'         : 'rgba(15,23,42,0.45)',
    modal:       isDark ? '#111029'                   : '#ffffff',
    border:      isDark ? 'rgba(255,255,255,0.09)'    : '#e2e8f0',
    title:       isDark ? '#f1f0f5'                   : '#0f172a',
    accent:      isDark ? '#818cf8'                   : '#4f46e5',
    label:       isDark ? 'rgba(255,255,255,0.38)'    : '#64748b',
    inputBg:     isDark ? 'rgba(255,255,255,0.05)'    : '#ffffff',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)'     : '#e2e8f0',
    inputText:   isDark ? '#f1f0f5'                   : '#1e293b',
    toggleIcon:  isDark ? 'rgba(255,255,255,0.35)'    : '#64748b',
    errBg:       isDark ? 'rgba(248,113,113,0.1)'     : '#fff1f2',
    errText:     isDark ? '#f87171'                   : '#b91c1c',
    cancelBorder:isDark ? 'rgba(255,255,255,0.1)'     : '#e2e8f0',
    cancelText:  isDark ? 'rgba(255,255,255,0.55)'    : '#475569',
    closeBg:     isDark ? 'rgba(255,255,255,0.05)'    : '#f1f5f9',
    closeText:   isDark ? 'rgba(255,255,255,0.4)'     : '#64748b',
  };

  const canSubmit = useMemo(() => (
    Boolean(newPassword.trim()) &&
    Boolean(confirmPassword.trim()) &&
    newPassword.trim().length >= 8 &&
    newPassword === confirmPassword
  ), [newPassword, confirmPassword]);

  if (!open) return null;

  const close = () => {
    setNewPassword('');
    setConfirmPassword('');
    setLocalError('');
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setLocalError(isArabic ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' : 'New password and confirmation do not match.');
      return;
    }
    if (newPassword.trim().length < 8) {
      setLocalError(isArabic ? 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' : 'New password must be at least 8 characters.');
      return;
    }
    setLocalError('');
    const saved = await onSave({ newPassword: newPassword.trim(), confirmPassword: confirmPassword.trim() });
    if (saved) close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 backdrop-blur-sm sm:items-center"
      style={{ background: T.overlay }}
    >
      <div
        className="w-full max-w-xl rounded-[1.8rem] p-5 shadow-2xl md:p-6"
        style={{ background: T.modal, border: `1px solid ${T.border}` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: T.accent }}>
                {isArabic ? 'الأمان' : 'Security'}
              </p>
              <h3 className="text-xl font-black" style={{ color: T.title }}>
                {isArabic ? 'تغيير كلمة المرور' : 'Change password'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl p-2 transition"
            style={{ background: T.closeBg, color: T.closeText }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <PasswordField
            T={T}
            label={isArabic ? 'كلمة المرور الجديدة' : 'New password'}
            value={newPassword}
            onChange={setNewPassword}
            visible={showNext}
            onToggle={() => setShowNext((v) => !v)}
            placeholder={isArabic ? '8 أحرف على الأقل' : 'At least 8 characters'}
          />
          <PasswordField
            T={T}
            label={isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            placeholder={isArabic ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
          />

          {localError ? (
            <p className="rounded-xl px-3 py-2 text-sm" style={{ background: T.errBg, color: T.errText }}>
              {localError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={close}
              className="rounded-full px-4 py-2 text-sm font-semibold transition"
              style={{ border: `1px solid ${T.cancelBorder}`, color: T.cancelText }}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving
                ? (isArabic ? 'جاري التحديث...' : 'Updating...')
                : (isArabic ? 'تحديث كلمة المرور' : 'Update password')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
