import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, UserRound, X } from 'lucide-react';
import { useLanguage } from '../../../utils/i18n';

const labelClass = 'text-xs font-bold uppercase tracking-[0.16em] text-slate-500';
const inputClass = 'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400';

export default function EditProfileModal({ open, profile, onClose, onSave, saving }) {
  const { isArabic } = useLanguage();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });

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

    if (form.fullName.trim() !== String(initial.fullName).trim()) {
      patch.fullName = form.fullName.trim();
    }

    if (form.phone.trim() !== String(initial.phone).trim()) {
      patch.phone = form.phone.trim();
    }

    return patch;
  }, [form, profile]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    await onSave(changedPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-indigo-200/40 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
              <UserRound size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{isArabic ? 'المعلومات الشخصية' : 'Personal Information'}</p>
              <h3 className="text-xl font-black text-slate-900">{isArabic ? 'تعديل بيانات الملف الشخصي' : 'Edit profile details'}</h3>
            </div>
          </div>

          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className={labelClass}>{isArabic ? 'الاسم' : 'Name'}</span>
            <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className={inputClass} />
          </label>

          <label className="block">
            <span className={labelClass}>{isArabic ? 'البريد الإلكتروني' : 'Email'}</span>
            <input value={form.email} className={`${inputClass} bg-slate-50 text-slate-500`} type="email" disabled readOnly />
          </label>

          <label className="block">
            <span className={labelClass}>{isArabic ? 'رقم الهاتف' : 'Phone'}</span>
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500">{isArabic ? 'سيتم إرسال الحقول التي تم تعديلها فقط.' : 'Only changed fields will be sent.'}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
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
