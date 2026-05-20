import AppError from '../utils/appError.js';
import {
  getQuizForLesson,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  generateQuizQuestions,
  addQuestion,
  deleteQuestion,
  submitQuizAttempt,
} from '../services/quizService.js';

const ts = () => new Date().toISOString();
const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, status, data, error: null, timestamp: ts() });

const lessonId = (req) => {
  const id = Number(req.params.lessonId);
  if (!Number.isFinite(id) || id <= 0) throw new AppError('Invalid lesson ID', 400);
  return id;
};

const resolveLang = (req) => (req.query.lang === 'en' || req.body?.lang === 'en') ? 'en' : 'ar';

const quizId = (req) => {
  const id = Number(req.params.quizId);
  if (!Number.isFinite(id) || id <= 0) throw new AppError('Invalid quiz ID', 400);
  return id;
};

export const getQuizController = async (req, res, next) => {
  try {
    const data = await getQuizForLesson(req.user, lessonId(req), resolveLang(req));
    return ok(res, data);
  } catch (err) { next(err); }
};

export const createQuizController = async (req, res, next) => {
  try {
    const { title, description, difficulty, passingScore } = req.body;
    if (!title) return next(new AppError('title is required', 400));
    const data = await createQuiz(req.user, lessonId(req), { title, description, difficulty, passingScore });
    return ok(res, data, 201);
  } catch (err) { next(err); }
};

export const updateQuizController = async (req, res, next) => {
  try {
    const data = await updateQuiz(req.user, quizId(req), req.body);
    return ok(res, data);
  } catch (err) { next(err); }
};

export const deleteQuizController = async (req, res, next) => {
  try {
    await deleteQuiz(req.user, quizId(req));
    return res.status(204).end();
  } catch (err) { next(err); }
};

export const generateQuestionsController = async (req, res, next) => {
  try {
    const { numQuestions, numMCQ, numTrueFalse, numShortAnswer, difficulty, notes, lang } = req.body;
    const data = await generateQuizQuestions(req.user, quizId(req), { numQuestions, numMCQ, numTrueFalse, numShortAnswer, difficulty, notes, lang });
    return ok(res, data);
  } catch (err) { next(err); }
};

export const addQuestionController = async (req, res, next) => {
  try {
    const { type, expectedAnswer, ...rest } = req.body;
    const data = await addQuestion(req.user, quizId(req), { ...rest, type, expectedAnswer, lang: resolveLang(req) });
    return ok(res, data, 201);
  } catch (err) { next(err); }
};

export const deleteQuestionController = async (req, res, next) => {
  try {
    await deleteQuestion(req.user, quizId(req), Number(req.params.questionId));
    return res.status(204).end();
  } catch (err) { next(err); }
};

export const submitAttemptController = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const data = await submitQuizAttempt(req.user, lessonId(req), { answers, lang: resolveLang(req) });
    return ok(res, data);
  } catch (err) { next(err); }
};
