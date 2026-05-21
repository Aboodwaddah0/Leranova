import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, UserRound, X } from 'lucide-react';
import { useLanguage } from '../../../utils/i18n';
import { useTheme } from '../../../contexts/ThemeContext';

export default function EditProfileModal({ open, profile, onClose, onSave, saving }) {
  const { isArabic } = useLanguage();
  const { isDark } = useTheme();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });

  const T = {
    overlay:      isDark ? 'rgba(4,4,20,0.7)'          : 'rgba(15,23,42,0.45)',
    modal:        isDark ? '#111029'                    : '#ffffff',
    border:       isDark ? 'rgba(255,255,255,0.09)'     : '#e2e8f0',
    title:        isDark ? '#f1f0f5'                    : '#0f172a',
    accent:       isDark ? '#818cf8'                    : '#4f46e5',
    label:        isDark ? 'rgba(255,255,255,0.38)'     : '#64748b',
    inputBg:      isDark ? 'rgba(255,255,255,0.05)'     : '#ffffff',
    inputBorder:  isDark ? 'rgba(255,255,255,0.1)'      : '#e2e8f0',
    inputFocus:   isDark ? 'rgba(129,140,248,0.5)'      : '#a5b4fc',
    inputText:    isDark ? '#f1f0f5'                    : '#1e293b',
    disabledBg:   isDark ? 'rgba(255,255,255,0.03)'     : '#f8fafc',
    disabledText: isDark ? 'rgba(255,255,255,0.28)'     : '#94a3b8',
    hint:         isDark ? 'rgba(255,255,255,0.3)'      : '#94a3b8',
    cancelBorder: isDark ? 'rgba(255,255,255,0.1)'      : '#e2e8f0',
    cancelText:   isDark ? 'rgba(255,255,255,0.55)'     : '#475569',
    cancelHover:  isDark ? 'rgba(255,255,255,0.05)'     : '#f8fafc',
    closeBg:      isDark ? 'rgba(255,255,255,0.05)'     : '#f1f5f9',
    closeText:    isDark ? 'rgba(255,255,255,0.4)'      : '#64748b',
  };

  useEffect(() => {
    if (!open) return;
    setForm({
      fullName: profile?.fullName || profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
    });
  }, [open, profile]);

  const changedPayload = useMemo(() => {
    const initial = {
      fullName: profile?.fullName || profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
    };
    const patch = {};
    if (form.fullName.trim() !== String(initial.fullName).trim()) patch.fullName = form.fullName.trim();
    if (form.phone.trim() !== String(initial.phone).trim()) patch.phone = form.phone.trim();
    return patch;
  }, [form, profile]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    await onSave(changedPayload);
  };

  const inputStyle = {
    marginTop: '8px',
    width: '100%',
    borderRadius: '1rem',
    border: `1px solid ${T.inputBorder}`,
    background: T.inputBg,
    color: T.inputText,
    padding: '12px 16px',
    fontSize: '0.875rem',
    outline: 'none',
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
              <UserRound size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: T.accent }}>
                {isArabic ? 'المعلومات الشخصية' : 'Personal Information'}
              </p>
              <h3 className="text-xl font-black" style={{ color: T.title }}>
                {isArabic ? 'تعديل بيانات الملف الشخصي' : 'Edit profile details'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 transition"
            style={{ background: T.closeBg, color: T.closeText }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: T.label }}>
              {isArabic ? 'الاسم' : 'Name'}
            </span>
            <input
              value={form.fullName}
              onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))}
              style={inputStyle}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: T.label }}>
              {isArabic ? 'البريد الإلكتروني' : 'Email'}
            </span>
            <input
              value={form.email}
              type="email"
              disabled
              readOnly
              style={{ ...inputStyle, background: T.disabledBg, color: T.disabledText, cursor: 'not-allowed' }}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: T.label }}>
              {isArabic ? 'رقم الهاتف' : 'Phone'}
            </span>
            <input
              value={form.phone}
              onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
              style={inputStyle}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs" style={{ color: T.hint }}>
              {isArabic ? 'سيتم إرسال الحقول التي تم تعديلها فقط.' : 'Only changed fields will be sent.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{ border: `1px solid ${T.cancelBorder}`, color: T.cancelText }}
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving || Object.keys(changedPayload).length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={15} />}
                {saving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ' : 'Save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
