import { useMemo, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';

const inputBase = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition focus:border-indigo-400';

function PasswordField({ label, value, onChange, visible, onToggle, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <div className="relative mt-2">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={inputBase}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

export default function ChangePasswordModal({ open, onClose, onSave, saving }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState('');

  const canSubmit = useMemo(() => {
    return (
      Boolean(newPassword.trim()) &&
      Boolean(confirmPassword.trim()) &&
      newPassword.trim().length >= 8 &&
      newPassword === confirmPassword
    );
  }, [newPassword, confirmPassword]);

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
      setLocalError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.trim().length < 8) {
      setLocalError('New password must be at least 8 characters.');
      return;
    }

    setLocalError('');

    const saved = await onSave({
      newPassword: newPassword.trim(),
      confirmPassword: confirmPassword.trim(),
    });

    if (saved) {
      close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-indigo-200/40 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Security</p>
              <h3 className="text-xl font-black text-slate-900">Change password</h3>
            </div>
          </div>

          <button type="button" onClick={close} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            visible={showNext}
            onToggle={() => setShowNext((value) => !value)}
            placeholder="At least 8 characters"
          />

          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirm}
            onToggle={() => setShowConfirm((value) => !value)}
            placeholder="Re-enter new password"
          />

          {localError ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{localError}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
