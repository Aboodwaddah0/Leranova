const STORAGE_KEY = 'learnova_student_lesson_progress_v1';
export const PROGRESS_EVENT = 'learnova-progress-changed';

const toNumberArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const readRawState = () => {
  if (typeof window === 'undefined') {
    return { completedLessonIds: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedLessonIds: [] };

    const parsed = JSON.parse(raw);
    return {
      completedLessonIds: toNumberArray(parsed?.completedLessonIds),
    };
  } catch {
    return { completedLessonIds: [] };
  }
};

const writeRawState = (nextState) => {
  if (typeof window === 'undefined') return;

  const safeState = {
    completedLessonIds: toNumberArray(nextState?.completedLessonIds),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
};

export const getCompletedLessonsSet = () => new Set(readRawState().completedLessonIds);

export const isLessonCompleted = (lessonId) => {
  const id = Number(lessonId);
  if (!Number.isInteger(id) || id <= 0) return false;
  return getCompletedLessonsSet().has(id);
};

export const setLessonCompleted = (lessonId, completed) => {
  const id = Number(lessonId);
  if (!Number.isInteger(id) || id <= 0) return;

  const current = getCompletedLessonsSet();

  if (completed) {
    current.add(id);
  } else {
    current.delete(id);
  }

  writeRawState({ completedLessonIds: Array.from(current) });
};

export const toggleLessonCompleted = (lessonId) => {
  const id = Number(lessonId);
  if (!Number.isInteger(id) || id <= 0) return false;

  const nextCompleted = !isLessonCompleted(id);
  setLessonCompleted(id, nextCompleted);
  return nextCompleted;
};

export const calculateProgressForLessons = (lessonIds = []) => {
  const normalized = lessonIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!normalized.length) {
    return { total: 0, completed: 0, percent: 0 };
  }

  const completedSet = getCompletedLessonsSet();
  const completed = normalized.filter((id) => completedSet.has(id)).length;
  const percent = Math.round((completed / normalized.length) * 100);

  return {
    total: normalized.length,
    completed,
    percent,
  };
};

export const subscribeToProgress = (listener) => {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event) => {
    if (event.key && event.key !== STORAGE_KEY) return;
    listener();
  };

  const onInternal = () => listener();

  window.addEventListener('storage', onStorage);
  window.addEventListener(PROGRESS_EVENT, onInternal);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(PROGRESS_EVENT, onInternal);
  };
};
