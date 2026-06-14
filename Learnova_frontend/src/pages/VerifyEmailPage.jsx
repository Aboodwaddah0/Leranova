import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import api from "../utils/api";
import { useLanguage } from "../utils/i18n";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const { t, isArabic } = useLanguage();
  const [status, setStatus] = useState("loading");
  const [autoApproved, setAutoApproved] = useState(false);
  const [message, setMessage] = useState("");
  // Guard against React 18 StrictMode double-invocation
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!token) {
      setStatus("error");
      setMessage(t.signup.verifyEmail.error);
      return;
    }

    api
      .get(`/auth/organization/verify-email/${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus("success");
        setAutoApproved(Boolean(res.data?.autoApproved));
        setMessage(res.data?.message || "");
      })
      .catch((err) => {
        setStatus("error");
        const backendMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          null;
        setMessage(backendMsg || t.signup.verifyEmail.error);
      });
  }, [token]);

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`flex min-h-screen items-center justify-center bg-slate-50 ${isArabic ? "lang-ar" : "lang-en"}`}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mb-8 flex justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              boxShadow: "0 4px 14px rgba(99,102,241,.5)",
            }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
            <p className="text-sm text-slate-500">{t.common.loading}</p>
          </div>
        )}

        {status === "success" && autoApproved && (
          <>
            <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-500" />
            <h1 className="mb-2 text-xl font-black text-slate-900">
              {t.signup.verifyEmail.successAutoApprovedTitle}
            </h1>
            <p className="mb-6 text-sm text-slate-500">
              {t.signup.verifyEmail.successAutoApproved}
            </p>
            <Link
              to="/login"
              className="inline-block rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              {t.signup.backToLogin}
            </Link>
          </>
        )}

        {status === "success" && !autoApproved && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <Clock size={28} className="text-amber-500" />
            </div>
            <h1 className="mb-2 text-xl font-black text-slate-900">
              {t.signup.verifyEmail.successPendingTitle}
            </h1>
            <p className="mb-6 text-sm text-slate-500">
              {t.signup.verifyEmail.successPending}
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link
                to="/login"
                className="inline-block rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                {isArabic ? "تسجيل الدخول" : "Go to Login"}
              </Link>
              <Link
                to="/"
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                {isArabic ? "الصفحة الرئيسية" : "Back to home"}
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={40} className="mx-auto mb-4 text-rose-500" />
            <h1 className="mb-2 text-xl font-black text-slate-900">
              {t.signup.verifyEmail.errorTitle}
            </h1>
            <p className="mb-6 text-sm text-slate-500">
              {message || t.signup.verifyEmail.error}
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link
                to="/login"
                className="inline-block rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                {isArabic ? "تسجيل الدخول" : "Go to Login"}
              </Link>
              <Link
                to="/signup"
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                {t.signup.verifyEmail.tryAgain}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
