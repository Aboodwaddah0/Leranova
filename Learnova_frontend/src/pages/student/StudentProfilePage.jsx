import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Save, UserRound } from 'lucide-react';
import StudentLayout from '../../components/student/StudentLayout';
import { fetchStudentProfile, updateStudentProfile } from '../../services/studentService';

export default function StudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const profile = await fetchStudentProfile();
        if (cancelled) return;
        setForm({
          fullName: profile?.fullName || '',
          email: profile?.email || '',
          phone: profile?.phone || '',
          password: '',
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Failed to load profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await updateStudentProfile({
        fullName: form.fullName,
        phone: form.phone,
        ...(form.password.trim() ? { password: form.password.trim() } : {}),
      });
      setForm((current) => ({ ...current, password: '' }));
      setMessage('Profile updated successfully.');
      setError('');
    } catch {
      setMessage('Could not update the profile right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudentLayout title="Profile" subtitle="Manage your student account">
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={18} /> Loading profile...
        </div>
      ) : (
        <>
          {error ? <div className="mb-5 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">{error}</div> : null}
        <form onSubmit={onSubmit} className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-indigo-500/5 backdrop-blur-xl md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white">
              <UserRound size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">Student account</p>
              <h1 className="text-2xl font-black text-slate-900">Edit profile</h1>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-1">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Full name</span>
              <input value={form.fullName} onChange={onChange('fullName')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400" />
            </label>

            <label className="space-y-2 md:col-span-1">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Email</span>
              <input value={form.email} disabled className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Phone</span>
              <input value={form.phone} onChange={onChange('phone')} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">New password</span>
              <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={onChange('password')}
                  placeholder="Leave blank if you do not want to change it"
                  className="w-full bg-transparent text-sm outline-none"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-slate-500 transition hover:text-slate-800">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
              <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
            {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          </div>
        </form>
        </>
      )}
    </StudentLayout>
  );
}
