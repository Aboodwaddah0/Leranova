import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Sparkles, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { updateAuthUser, logout } from "../redux/slices/authSlice";
import api from "../utils/api";
import { useLanguage } from "../utils/i18n";
import { notifyError, notifySuccess } from "../lib/notify";

const rolePaths = {
  ORGANIZATION: "/dashboard/organization",
  STUDENT:      "/dashboard/student",
  TEACHER:      "/dashboard/instructor",
  INSTRUCTOR:   "/dashboard/instructor",
  PARENT:       "/dashboard/parent",
  ADMIN:        "/admin",
};

export default function ForceChangePasswordPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { isArabic } = useLanguage();
  const user      = useSelector((s) => s.auth.user);
  const role      = useSelector((s) => s.auth.role);

  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [loading, setLoading]             = useState(false);

  const t = {
    title:         isArabic ? "تغيير كلمة المرور" : "Change your password",
    subtitle:      isArabic ? "يجب عليك تغيير كلمة المرور المؤقتة قبل المتابعة." : "You must set a new password before continuing.",
    newLabel:      isArabic ? "كلمة المرور الجديدة" : "New password",
    confirmLabel:  isArabic ? "تأكيد كلمة المرور" : "Confirm password",
    submit:        isArabic ? "حفظ وتسجيل الدخول" : "Save & continue",
    saving:        isArabic ? "جاري الحفظ..." : "Saving...",
    mismatch:      isArabic ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
    tooShort:      isArabic ? "يجب أن تكون كلمة المرور 8 أحرف على الأقل" : "Password must be at least 8 characters",
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { notifyError(t.tooShort); return; }
    if (newPassword !== confirmPassword) { notifyError(t.mismatch); return; }

    setLoading(true);
    try {
      await api.patch("/auth/change-password", { newPassword });
      notifySuccess(isArabic ? "تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول من جديد" : "Password changed. Please log in with your new password.");
      dispatch(logout());
      navigate("/login", { replace: true });
    } catch (err) {
      notifyError(err.message || (isArabic ? "حدث خطأ" : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`flex min-h-screen items-center justify-center bg-slate-50 ${isArabic ? "lang-ar" : "lang-en"}`}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,.5)" }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
        </div>

        <div className="mb-6 text-center">
          <ShieldCheck size={36} className="mx-auto mb-3 text-indigo-500" />
          <h1 className="text-xl font-black text-slate-900">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t.newLabel}</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 pr-11 text-sm focus:border-indigo-400 focus:outline-none"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t.confirmLabel}</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 pr-11 text-sm focus:border-indigo-400 focus:outline-none"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? t.saving : t.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
