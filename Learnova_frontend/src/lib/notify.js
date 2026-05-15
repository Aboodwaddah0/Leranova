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
  gooeyToast.success(`⚡ +${amount} XP earned`, withLearnovaStyle("success", {
    fillColor: "#fffbeb",
    borderColor: "#fcd34d",
    duration: 3000,
  }));
};

export const notifyAchievement = (label) => {
  if (!label) return;
  gooeyToast.success(`🏆 Achievement unlocked: ${label}`, withLearnovaStyle("success", {
    duration: 5200,
  }));
};

export const notifyLevelUp = (level) => {
  if (!level) return;
  gooeyToast(`⚡ Level Up! You're now Level ${level}`, withLearnovaStyle("info", {
    fillColor: "#f5f3ff",
    borderColor: "#c4b5fd",
    duration: 5500,
  }));
};

export const notifyStreakMilestone = (days) => {
  if (!days) return;
  gooeyToast.warning(`🔥 ${days}-day streak! Keep the momentum going!`, withLearnovaStyle("warning", {
    duration: 4800,
  }));
};

export const notifyQuizPass = (score) => {
  const msg = score === 100
    ? "🌟 Perfect quiz score! Flawless!"
    : `✓ Quiz passed with ${score}%`;
  gooeyToast.success(msg, withLearnovaStyle("success", { duration: 3800 }));
};
