import { Link } from "react-router-dom";
import { CheckCircle, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "../utils/i18n";

const steps = {
  en: [
    { icon: CheckCircle, label: "Payment received",   done: true  },
    { icon: Mail,        label: "Verify your email",  done: false },
    { icon: ShieldCheck, label: "Admin approval",      done: false },
  ],
  ar: [
    { icon: CheckCircle, label: "تم استلام الدفع",    done: true  },
    { icon: Mail,        label: "تحقق من بريدك",       done: false },
    { icon: ShieldCheck, label: "موافقة المشرف",       done: false },
  ],
};

export default function PaymentSuccessPage() {
  const { lang, isArabic, t, toggleLang } = useLanguage();

  const currentSteps = isArabic ? steps.ar : steps.en;

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`grid min-h-screen place-items-center px-4 ${isArabic ? "lang-ar" : "lang-en"}`}
      style={{ background: "#f0f4ff" }}
    >
      {/* Lang toggle */}
      <button
        type="button"
        onClick={toggleLang}
        className="absolute end-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-200"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl text-center">

          {/* Icon */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,.35)" }}>
            <Mail size={36} className="text-white" />
          </div>

          {/* Badge */}
          <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em]"
            style={{ background: "rgba(99,102,241,.1)", color: "#6366f1" }}>
            {isArabic ? "خطوة واحدة متبقية" : "One step remaining"}
          </span>

          {/* Heading */}
          <h1 className="mt-4 text-2xl font-black text-slate-900">
            {isArabic ? "تحقق من بريدك الإلكتروني" : "Check your email"}
          </h1>

          {/* Body */}
          <p className="mt-3 text-sm leading-7 text-slate-500 max-w-sm mx-auto">
            {isArabic
              ? "تم استلام الدفع بنجاح. أرسلنا إليك رسالة تحقق — انقر على الرابط في البريد لتفعيل حسابك وإرساله للمراجعة."
              : "Payment received! We sent you a verification email — click the link inside to activate your account and submit it for review."}
          </p>

          {/* Steps */}
          <div className="mt-7 flex items-center justify-center gap-0">
            {currentSteps.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === currentSteps.length - 1;
              return (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition"
                      style={
                        step.done
                          ? { background: "#10b981", borderColor: "#10b981" }
                          : i === 1
                          ? { background: "rgba(99,102,241,.12)", borderColor: "#6366f1" }
                          : { background: "#f8fafc", borderColor: "#e2e8f0" }
                      }
                    >
                      <Icon
                        size={16}
                        style={
                          step.done
                            ? { color: "#fff" }
                            : i === 1
                            ? { color: "#6366f1" }
                            : { color: "#94a3b8" }
                        }
                      />
                    </div>
                    <span
                      className="text-[10px] font-bold text-center max-w-[72px] leading-tight"
                      style={
                        step.done ? { color: "#10b981" } : i === 1 ? { color: "#6366f1" } : { color: "#94a3b8" }
                      }
                    >
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className="mx-2 mb-5 h-0.5 w-10 rounded"
                      style={{ background: step.done ? "#10b981" : "#e2e8f0" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Hint */}
          <p className="mt-6 text-xs text-slate-400">
            {isArabic
              ? "لم تجد الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)."
              : "Can't find the email? Check your spam or junk folder."}
          </p>

          {/* CTA */}
          <Link
            to="/login"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,.4)" }}
          >
            <Sparkles size={15} />
            {isArabic ? "الانتقال إلى تسجيل الدخول" : "Go to login"}
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-slate-400">
          {isArabic
            ? "سيتم مراجعة حسابك من قبل الإدارة بعد التحقق من بريدك."
            : "Your account will be reviewed by an admin after email verification."}
        </p>
      </div>
    </main>
  );
}
