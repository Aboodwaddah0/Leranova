import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

/* ─── Step definitions ───────────────────────────────────────────────────── */
const SCHOOL_STEPS = [
  {
    kind: "form",
    formType: "year",
    title: "Create Academic Year",
    subtitle: "Set up the current school year before anything else.",
  },
  {
    kind: "form",
    formType: "term",
    title: "Add a Term",
    subtitle: "At least one term is required to track student progress.",
  },
  {
    kind: "discovery",
    icon: "👩‍🏫",
    title: "Add Your Teachers",
    description:
      "Go to the Teachers tab to invite staff. Each teacher gets login credentials automatically generated.",
    actionLabel: "Go to Teachers",
    actionTab: "teachers",
  },
  {
    kind: "discovery",
    icon: "🏫",
    title: "Set Up Grade Levels",
    description:
      "In the Grades tab, create a grade for each year level in your school and assign class teachers.",
    actionLabel: "Go to Grades",
    actionTab: "courses",
  },
  {
    kind: "discovery",
    icon: "📚",
    title: "Add Subjects",
    description:
      "Open the Subjects tab to add subjects per grade and assign them to teachers.",
    actionLabel: "Go to Subjects",
    actionTab: "subjects",
  },
  {
    kind: "discovery",
    icon: "🎒",
    title: "Enroll Students",
    description:
      "Add students individually or import them in bulk from an Excel file in the Students tab.",
    actionLabel: "Go to Students",
    actionTab: "students",
  },
];

const ACADEMY_STEPS = [
  {
    kind: "discovery",
    icon: "👩‍🏫",
    title: "Add Teacher",
    description:
      "Go to the Teachers tab to invite instructors. Login credentials are auto-generated.",
    actionLabel: "Go to Teachers",
    actionTab: "teachers",
  },
  {
    kind: "discovery",
    icon: "🎓",
    title: "Add Specializations",
    description:
      "In the Courses tab, create specializations (tracks) for your academy — e.g. Web Development, Design, Business.",
    actionLabel: "Go to Specializations",
    actionTab: "courses",
  },
  {
    kind: "discovery",
    icon: "📚",
    title: "Add Courses",
    description:
      "Attach courses to each specialization and assign them to your instructors in the Subjects tab.",
    actionLabel: "Go to Courses",
    actionTab: "subjects",
  },
  {
    kind: "discovery",
    icon: "🎒",
    title: "Enroll Students",
    description:
      "Add students individually or import them in bulk from an Excel file in the Students tab.",
    actionLabel: "Go to Students",
    actionTab: "students",
  },
];

/* ─── Step indicator ─────────────────────────────────────────────────────── */
function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0 px-6 pt-5 pb-1">
      {steps.map((step, i) => (
        <span key={i} className="flex flex-1 items-center">
          <span
            className={[
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
              i < current
                ? "bg-indigo-600 text-white"
                : i === current
                ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                : "bg-slate-100 text-slate-400",
            ].join(" ")}
          >
            {i < current ? <Check size={13} /> : i + 1}
          </span>
          {i < steps.length - 1 && (
            <span
              className={[
                "h-0.5 flex-1 transition-colors duration-300",
                i < current ? "bg-indigo-600" : "bg-slate-200",
              ].join(" ")}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/* ─── Year form (Step 0 for SCHOOL) ──────────────────────────────────────── */
function YearForm({ form, onChange, onSubmit, submitting, error, done, createdYear }) {
  if (done && createdYear) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check className="text-emerald-600" size={28} />
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Academic year <span className="text-indigo-600">"{createdYear.name}"</span> created!
        </p>
        <p className="text-xs text-slate-400">Click Next to add your first term.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 px-6 pb-2 pt-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Year Name</label>
        <input
          type="text"
          placeholder="e.g. 2025 / 2026"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          required
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Start Date</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">End Date</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => onChange("endDate", e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Number of Terms</label>
        <select
          value={form.numberOfTerms}
          onChange={(e) => onChange("numberOfTerms", Number(e.target.value))}
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold text-white transition-opacity disabled:opacity-60"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {submitting ? "Creating…" : "Create Academic Year"}
      </button>
    </form>
  );
}

/* ─── Term form (Step 1 for SCHOOL) ──────────────────────────────────────── */
function TermForm({ form, onChange, onSubmit, submitting, error, done }) {
  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check className="text-emerald-600" size={28} />
        </div>
        <p className="text-sm font-semibold text-slate-700">Term added successfully!</p>
        <p className="text-xs text-slate-400">
          You can add more terms later from the School tab → Manage Years.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 px-6 pb-2 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Term Number</label>
          <input
            type="number"
            min={1}
            value={form.termNumber}
            onChange={(e) => onChange("termNumber", Number(e.target.value))}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Term Name</label>
          <input
            type="text"
            placeholder="e.g. First Term"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Start Date</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">End Date</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => onChange("endDate", e.target.value)}
            required
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </div>
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold text-white transition-opacity disabled:opacity-60"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {submitting ? "Adding…" : "Add Term"}
      </button>
    </form>
  );
}

/* ─── Discovery step ─────────────────────────────────────────────────────── */
function DiscoveryStep({ step, onGoToTab, onSkip }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-5xl shadow-sm">
        {step.icon}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-black text-slate-900">{step.title}</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">{step.description}</p>
      </div>
      <button
        onClick={onGoToTab}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 transition-opacity"
      >
        {step.actionLabel}
        <ChevronRight size={15} />
      </button>
      <button
        onClick={onSkip}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        I'll do this later
      </button>
    </div>
  );
}

/* ─── Main wizard ────────────────────────────────────────────────────────── */
export default function OrgOnboardingWizard({
  orgKey,
  orgType,
  academicYears,
  createAcademicYear,
  createTerm,
  setActiveTab,
  onComplete,
  forceOpen = false,
  hasTerm = false,
}) {
  const isSchool = String(orgType || "").toUpperCase() === "SCHOOL";
  const steps = isSchool ? SCHOOL_STEPS : ACADEMY_STEPS;
  const storageKey = `learnova_onboarding_${orgKey}_done`;

  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Year form state (SCHOOL step 0)
  const [yearForm, setYearForm] = useState({ name: "", startDate: "", endDate: "", numberOfTerms: 1 });
  const [createdYear, setCreatedYear] = useState(null);
  const [yearDone, setYearDone] = useState(false);

  // Term form state (SCHOOL step 1)
  const [termForm, setTermForm] = useState({ termNumber: 1, name: "", startDate: "", endDate: "" });
  const [termDone, setTermDone] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const forceOpenRef = useRef(false);

  // ── Mount check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgKey) return;
    if (localStorage.getItem(storageKey)) return;

    // Skip silently for schools that already completed setup in the workspace
    if (isSchool && Array.isArray(academicYears) && academicYears.length > 0) {
      localStorage.setItem(storageKey, "1");
      return;
    }

    setVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgKey]);

  // ── forceOpen: re-open from overview checklist ─────────────────────────
  useEffect(() => {
    if (forceOpen && !forceOpenRef.current) {
      localStorage.removeItem(storageKey);
      const yearAlreadyDone = isSchool && Array.isArray(academicYears) && academicYears.length > 0;
      const termAlreadyDone = yearAlreadyDone && hasTerm;
      setYearDone(yearAlreadyDone);
      setTermDone(termAlreadyDone);
      if (yearAlreadyDone && academicYears[0]) {
        setCreatedYear(academicYears[0]);
      } else {
        setCreatedYear(null);
        setYearForm({ name: "", startDate: "", endDate: "", numberOfTerms: 1 });
      }
      if (isSchool) {
        if (!yearAlreadyDone) setCurrentStep(0);
        else if (!termAlreadyDone) setCurrentStep(1);
        else setCurrentStep(2);
      } else {
        setCurrentStep(0);
      }
      setFormError("");
      setVisible(true);
    }
    forceOpenRef.current = forceOpen;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen]);

  // ── Dismiss / complete ─────────────────────────────────────────────────
  const handleComplete = () => {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
    onComplete?.();
  };

  // ── Next / advance ─────────────────────────────────────────────────────
  const canAdvance = () => {
    const step = steps[currentStep];
    if (step.kind === "discovery") return true;
    if (step.formType === "year") return yearDone;
    if (step.formType === "term") return termDone;
    return false;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setFormError("");
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    setFormError("");
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  // ── Year submit ────────────────────────────────────────────────────────
  const handleYearSubmit = async (e) => {
    e.preventDefault();
    if (yearDone) return;
    setFormError("");
    setSubmitting(true);
    try {
      const year = await createAcademicYear({
        name: yearForm.name,
        startDate: yearForm.startDate,
        endDate: yearForm.endDate,
        numberOfTerms: yearForm.numberOfTerms,
      });
      setCreatedYear(year);
      setYearDone(true);
    } catch (err) {
      setFormError(err?.response?.data?.error || err?.message || "Failed to create academic year.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Term submit ────────────────────────────────────────────────────────
  const handleTermSubmit = async (e) => {
    e.preventDefault();
    if (termDone || !createdYear) return;
    setFormError("");
    setSubmitting(true);
    try {
      await createTerm(createdYear.id, {
        termNumber: termForm.termNumber,
        name: termForm.name,
        startDate: termForm.startDate,
        endDate: termForm.endDate,
      });
      setTermDone(true);
    } catch (err) {
      setFormError(err?.response?.data?.error || err?.message || "Failed to create term.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render step content ────────────────────────────────────────────────
  const renderStepContent = () => {
    const step = steps[currentStep];

    if (step.kind === "form" && step.formType === "year") {
      return (
        <YearForm
          form={yearForm}
          onChange={(k, v) => setYearForm((f) => ({ ...f, [k]: v }))}
          onSubmit={handleYearSubmit}
          submitting={submitting}
          error={formError}
          done={yearDone}
          createdYear={createdYear}
        />
      );
    }

    if (step.kind === "form" && step.formType === "term") {
      return (
        <TermForm
          form={termForm}
          onChange={(k, v) => setTermForm((f) => ({ ...f, [k]: v }))}
          onSubmit={handleTermSubmit}
          submitting={submitting}
          error={formError}
          done={termDone}
        />
      );
    }

    return (
      <DiscoveryStep
        step={step}
        onGoToTab={() => {
          setActiveTab(step.actionTab);
          handleComplete();
        }}
        onSkip={handleNext}
      />
    );
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="onboarding-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleComplete}
            className="fixed inset-0 z-[6999] bg-black/55 backdrop-blur-sm"
          />

          {/* Card wrapper — pointer-events-none so clicks outside fall through to backdrop */}
          <motion.div
            key="onboarding-card-wrapper"
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-[7000] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-[520px] rounded-3xl bg-white shadow-[0_32px_80px_-16px_rgba(15,23,42,0.55)] pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header gradient strip */}
              <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-500 px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-0.5">
                  Getting Started
                </p>
                <h2 className="text-xl font-black text-white leading-tight">
                  Welcome to Learnova!
                </h2>
                <p className="text-sm text-white/75 mt-0.5">
                  Let's set up your workspace step by step.
                </p>
                {/* Close button */}
                <button
                  onClick={handleComplete}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Step indicator */}
              <StepIndicator steps={steps} current={currentStep} />

              {/* Step label */}
              <p className="px-6 pt-2 pb-0 text-xs font-bold uppercase tracking-widest text-indigo-600">
                Step {currentStep + 1} of {steps.length} — {steps[currentStep].title}
              </p>

              {/* Animated step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.18 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>

              {/* Footer navigation */}
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <div>
                  {currentStep > 0 ? (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <ChevronLeft size={15} />
                      Back
                    </button>
                  ) : (
                    <button
                      onClick={handleComplete}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Skip setup
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Only show Next for non-discovery steps or the last step */}
                  {steps[currentStep].kind !== "discovery" && (
                    <button
                      onClick={handleNext}
                      disabled={!canAdvance()}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-40"
                    >
                      {currentStep === steps.length - 1 ? "Finish" : "Next"}
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
