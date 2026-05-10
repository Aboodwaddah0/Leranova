import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getQuizController,
  createQuizController,
  updateQuizController,
  deleteQuizController,
  generateQuestionsController,
  addQuestionController,
  deleteQuestionController,
  submitAttemptController,
} from '../controllers/quizController.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Quiz CRUD (lesson-scoped)
router.get('/quiz',              getQuizController);
router.post('/quiz',             createQuizController);
router.patch('/quiz/:quizId',    updateQuizController);
router.delete('/quiz/:quizId',   deleteQuizController);

// AI generation & question management
router.post('/quiz/:quizId/generate',                    generateQuestionsController);
router.post('/quiz/:quizId/questions',                   addQuestionController);
router.delete('/quiz/:quizId/questions/:questionId',     deleteQuestionController);

// Student attempt
router.post('/quiz/attempt',  submitAttemptController);

export default router;
