import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PlanSelector from "../components/auth/PlanSelector";
import OrgSignupForm from "../components/auth/OrgSignupForm";
import { registerOrganizationThunk } from "../redux/thunks/authThunks";
import { useLanguage } from "../utils/i18n";
import authPhoto from "../assets/authPhoto.jpg";
import QuantumMeshBackground from "../components/ui/QuantumMeshBackground";
import { notifyError } from "../lib/notify";

export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, plans } = useSelector((state) => state.auth);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const { lang, isArabic, t, toggleLang } = useLanguage();
  const hasPlans = Array.isArray(plans) && plans.length > 0;

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const handleSignup = async (payload) => {
    const result = await dispatch(registerOrganizationThunk(payload));

    if (registerOrganizationThunk.fulfilled.match(result)) {
      const checkoutUrl = result.payload?.checkout?.checkoutUrl;

      if (checkoutUrl) {
        navigate("/signup/checkout", {
          state: { checkout: result.payload?.checkout },
        });
        return;
      }

      navigate("/login");
    }
  };

  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#f7f9fb] px-4 py-8 ${isArabic ? "lang-ar" : "lang-en"}`}>
      <QuantumMeshBackground />

      <button
        type="button"
        onClick={toggleLang}
        className="absolute right-6 top-6 z-20 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        {lang === "en" ? t.common.switchToArabic : t.common.switchToEnglish}
      </button>

      <div className="relative z-10 mx-auto grid max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_56px_-26px_rgba(16,20,26,0.55)] lg:grid-cols-[1.25fr_0.75fr]">
        <section className="p-6 md:p-10">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                {t.signup.badge}
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-900">
                {t.signup.title}
              </h1>
            </div>
            <Link to="/login" className="font-semibold text-sky-700">
              {t.signup.backToLogin}
            </Link>
          </div>

          <div className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 lg:hidden">
            <img src={authPhoto} alt="Auth visual" className="h-56 w-full object-cover" />
          </div>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-900">{t.signup.step1}</h2>
            <PlanSelector selectedPlanId={selectedPlanId} onSelect={setSelectedPlanId} t={t} />
            {!hasPlans && (
              <p className="mt-2 text-xs text-slate-500">{t.signup.noPlansProceedHint}</p>
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-slate-900">
              {t.signup.step2}
            </h2>
            <OrgSignupForm
              selectedPlanId={selectedPlanId}
              onSubmit={handleSignup}
              loading={loading}
              t={t}
            />
          </section>

        </section>

        <aside className="relative hidden min-h-full lg:block">
          <img src={authPhoto} alt="Auth visual" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-900/70 via-blue-700/45 to-slate-950/65" />
          <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">
              {t.signup.badge}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-7 text-slate-100">
              {t.signup.noPlansText}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
