import { gooeyToast } from "goey-toast";

export const LEARNOVA_TOASTER_PROPS = {
  position: "top-right",
  theme: "light",
  showProgress: true,
  closeOnEscape: true,
  swipeToDismiss: true,
  preset: "smooth",
  bounce: 0.32,
  offset: "20px",
  gap: 12,
  maxQueue: 6,
  queueOverflow: "drop-oldest",
  duration: 4200,
};

const LEARNOVA_TOAST_STYLE = {
  default: { fillColor: "#f8fbff", borderColor: "#bfdbfe", duration: 3800 },
  success: { fillColor: "#ecfdf5", borderColor: "#6ee7b7", duration: 4200 },
  error: { fillColor: "#fff1f2", borderColor: "#fda4af", duration: 6000 },
  warning: { fillColor: "#fffbeb", borderColor: "#fcd34d", duration: 5200 },
  info: { fillColor: "#eff6ff", borderColor: "#93c5fd", duration: 4200 },
};

const getToastClassNames = () => {
  return {
    wrapper: "learnova-toast-wrapper",
    content: "learnova-toast-content",
    title: "learnova-toast-title",
    description: "learnova-toast-description",
    actionButton: "learnova-toast-action",
  };
};

const withLearnovaStyle = (type, options = {}) => {
  const style = LEARNOVA_TOAST_STYLE[type] || LEARNOVA_TOAST_STYLE.default;
  const incomingClassNames = options.classNames || {};

  return {
    spring: true,
    borderWidth: 1.8,
    preset: "smooth",
    classNames: {
      ...getToastClassNames(),
      ...incomingClassNames,
    },
    ...style,
    ...options,
  };
};

export const notify = (message, options = {}) => {
  if (!message) {
    return;
  }
  gooeyToast(String(message), withLearnovaStyle("default", options));
};

export const notifySuccess = (message, options = {}) => {
  if (!message) {
    return;
  }
  gooeyToast.success(String(message), withLearnovaStyle("success", options));
};

export const notifyError = (message, options = {}) => {
  if (!message) {
    return;
  }
  gooeyToast.error(String(message), withLearnovaStyle("error", options));
};

export const notifyInfo = (message, options = {}) => {
  if (!message) {
    return;
  }
  gooeyToast.info(String(message), withLearnovaStyle("info", options));
};

export const notifyWarning = (message, options = {}) => {
  if (!message) {
    return;
  }
  gooeyToast.warning(String(message), withLearnovaStyle("warning", options));
};

// ── Gamification event toasts ──────────────────────────────────────────────────

export const notifyXpGained = (amount) => {
  if (!amount) return;
  gooeyToast.success(`⚡ +${amount} XP`, withLearnovaStyle("success", {
    fillColor: "#fefce8",
    borderColor: "#fde68a",
    duration: 2800,
  }));
};

export const notifyAchievement = (label) => {
  if (!label) return;
  gooeyToast.success(`🏆 Achievement Unlocked\n${label}`, withLearnovaStyle("success", {
    fillColor: "#fefce8",
    borderColor: "#fbbf24",
    duration: 5500,
  }));
};

export const notifyLevelUp = (level) => {
  if (!level) return;
  gooeyToast(`🚀 Level Up! You're now Level ${level}`, withLearnovaStyle("info", {
    fillColor: "#f5f3ff",
    borderColor: "#a78bfa",
    duration: 6000,
  }));
};

export const notifyStreakMilestone = (days) => {
  if (!days) return;
  gooeyToast.warning(`🔥 ${days}-day streak! Keep going!`, withLearnovaStyle("warning", {
    duration: 4500,
  }));
};

export const notifyQuizPass = (score) => {
  const msg = score === 100
    ? "🌟 Perfect score! Flawless!"
    : `✓ Quiz passed — ${score}%`;
  gooeyToast.success(msg, withLearnovaStyle("success", { duration: 3500 }));
};

export const notifyQuizFailed = (score) => {
  const msg = score != null
    ? `✗ Not passed — ${score}%. Keep practicing!`
    : "✗ Not passed. Keep practicing!";
  gooeyToast.error(msg, withLearnovaStyle("error", {
    fillColor: "#fff7ed",
    borderColor: "#fdba74",
    duration: 4000,
  }));
};

export const notifyLessonComplete = (label = "Lesson complete!") => {
  gooeyToast.success(`✓ ${label}`, withLearnovaStyle("success", {
    fillColor: "#f0fdf4",
    borderColor: "#86efac",
    duration: 2800,
  }));
};

export const notifyCommentPosted = (label = "Comment posted!") => {
  gooeyToast.success(`💬 ${label}`, withLearnovaStyle("success", {
    duration: 2000,
  }));
};

export const notifyProfileSaved = (label = "Profile updated!") => {
  gooeyToast.success(`✓ ${label}`, withLearnovaStyle("success", {
    duration: 2800,
  }));
};

export const notifyPasswordChanged = (label = "Password updated!") => {
  gooeyToast.success(`🔒 ${label}`, withLearnovaStyle("success", {
    duration: 2800,
  }));
};
