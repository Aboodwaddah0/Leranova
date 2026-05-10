import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';
import ParentLayout from '../../components/parent/ParentLayout';
import { fetchMyParentProfile, updateMyParentProfile } from '../../services/parentService';
import { useLanguage } from '../../utils/i18n';
import { notifyError, notifySuccess } from '../../lib/notify';
import { updateAuthUser } from '../../redux/slices/authSlice';

const GENDER_OPTIONS = [
  { value: '',       labelEn: 'Select gender', labelAr: 'اختر الجنس' },
  { value: 'MALE',   labelEn: 'Male',          labelAr: 'ذكر'        },
  { value: 'FEMALE', labelEn: 'Female',        labelAr: 'أنثى'       },
];

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

export default function ParentSettingsPage() {
  const { isArabic } = useLanguage();
  const dispatch = useDispatch();

  /* ── Profile form ── */
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({ name: '', gender: '', age: '', address: '' });

  /* ── Password form ── */
  const [pwForm,      setPwForm]      = useState({ newPassword: '', confirmPassword: '' });
  const [savingPw,    setSavingPw]    = useState(false);
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError,     setPwError]     = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMyParentProfile();
        if (!cancelled && data) {
          setProfile(data);
          setForm({
            name:    data.name    || '',
            gender:  data.gender  || '',
            age:     data.age     != null ? String(data.age) : '',
            address: data.address || '',
          });
        }
      } catch {
        if (!cancelled) notifyError(isArabic ? 'فشل تحميل الملف الشخصي' : 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isArabic]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    const payload = {};
    if (form.name.trim())    payload.name    = form.name.trim();
    if (form.gender)         payload.gender  = form.gender;
    if (form.age !== '')     payload.age     = Number(form.age);
    if (form.address.trim()) payload.address = form.address.trim();

    if (Object.keys(payload).length === 0) {
      notifyError(isArabic ? 'لم تقم بتغيير أي شيء' : 'No changes to save');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyParentProfile(payload);
      if (updated) dispatch(updateAuthUser(updated));
      notifySuccess(isArabic ? 'تم حفظ الملف الشخصي بنجاح' : 'Profile saved successfully');
    } catch (err) {
      notifyError(err?.response?.data?.message || (isArabic ? 'فشل حفظ الملف الشخصي' : 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword.length < 8) {
      setPwError(isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError(isArabic ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await updateMyParentProfile({ password: pwForm.newPassword });
      notifySuccess(isArabic ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setPwForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      notifyError(err?.response?.data?.message || (isArabic ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <ParentLayout>
      {/* Hero header */}
      <div className="mb-8 rounded-[24px] bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="flex items-center gap-3 mb-1">
          <User size={28} className="opacity-80" />
          <h1 className="text-2xl font-black">{isArabic ? 'إعدادات الحساب' : 'Account Settings'}</h1>
        </div>
        <p className="text-indigo-200 text-sm">
          {isArabic ? 'تعديل معلوماتك الشخصية وكلمة المرور' : 'Edit your personal information and password'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-white border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Personal Information ── */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <User size={18} />
              </div>
              <div>
                <p className="font-black text-slate-900">{isArabic ? 'المعلومات الشخصية' : 'Personal Information'}</p>
                <p className="text-xs text-slate-500">{isArabic ? 'تعديل بياناتك الأساسية' : 'Edit your basic details'}</p>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="grid gap-5 sm:grid-cols-2">
              <Field label={isArabic ? 'الاسم' : 'Name'}>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder={isArabic ? 'أدخل اسمك' : 'Enter your name'}
                />
              </Field>

              <Field label={isArabic ? 'البريد الإلكتروني (غير قابل للتعديل)' : 'Email (read-only)'}>
                <input value={profile?.email || ''} disabled className={inputCls} />
              </Field>

              <Field label={isArabic ? 'الجنس' : 'Gender'}>
                <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isArabic ? opt.labelAr : opt.labelEn}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={isArabic ? 'العمر' : 'Age'}>
                <input
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  min={0}
                  className={inputCls}
                  placeholder={isArabic ? 'أدخل عمرك' : 'Enter your age'}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label={isArabic ? 'العنوان' : 'Address'}>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder={isArabic ? 'أدخل عنوانك' : 'Enter your address'}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Save size={15} />
                  {saving
                    ? (isArabic ? 'جاري الحفظ...' : 'Saving...')
                    : (isArabic ? 'حفظ التغييرات' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>

          {/* ── Change Password ── */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Lock size={18} />
              </div>
              <div>
                <p className="font-black text-slate-900">{isArabic ? 'تغيير كلمة المرور' : 'Change Password'}</p>
                <p className="text-xs text-slate-500">{isArabic ? 'يجب أن تكون 8 أحرف على الأقل' : 'Must be at least 8 characters'}</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSave} className="grid gap-5 sm:grid-cols-2">
              <Field label={isArabic ? 'كلمة المرور الجديدة' : 'New Password'}>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className={`${inputCls} pe-10`}
                    placeholder={isArabic ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Field label={isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className={`${inputCls} pe-10`}
                    placeholder={isArabic ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {pwError && (
                <p className="sm:col-span-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
                  {pwError}
                </p>
              )}

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPw}
                  className="flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                >
                  <Lock size={15} />
                  {savingPw
                    ? (isArabic ? 'جاري التغيير...' : 'Changing...')
                    : (isArabic ? 'تغيير كلمة المرور' : 'Change Password')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ParentLayout>
  );
}
