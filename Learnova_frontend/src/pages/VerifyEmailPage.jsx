import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "../utils/api";
import { useLanguage } from "../utils/i18n";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const { t, isArabic } = useLanguage();
  const [status, setStatus] = useState("loading");
  const [autoApproved, setAutoApproved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
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
      .catch(() => {
        setStatus("error");
        setMessage(t.signup.verifyEmail.error);
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
            <CheckCircle2 size={40} className="mx-auto mb-4 text-indigo-500" />
            <h1 className="mb-2 text-xl font-black text-slate-900">
              {t.signup.verifyEmail.successPendingTitle}
            </h1>
            <p className="mb-6 text-sm text-slate-500">
              {t.signup.verifyEmail.successPending}
            </p>
            <Link
              to="/"
              className="inline-block rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:border-indigo-200"
            >
              {isArabic ? "الصفحة الرئيسية" : "Back to home"}
            </Link>
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
            <Link
              to="/signup"
              className="inline-block rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:border-indigo-200"
            >
              {t.signup.verifyEmail.tryAgain}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
