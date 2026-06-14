import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getStudentContextController,
  getSchoolSubjectsController,
  getAcademyTracksController,
  getAcademyTrackSubjectsController,
  getRecentAcademySubjectsController,
  subscribeAcademySubjectController,
  getAcademySubscriptionsController,
  verifyAcademyCheckoutController,
} from '../controllers/studentExperienceController.js';

const router = Router();

router.use(authMiddleware);

router.get('/me/context', getStudentContextController);
router.get('/school/subjects', getSchoolSubjectsController);
router.get('/academy/tracks', getAcademyTracksController);
router.get('/academy/subjects/recent', getRecentAcademySubjectsController);
router.get('/academy/tracks/:trackId/subjects', getAcademyTrackSubjectsController);
router.post('/academy/subjects/:subjectId/subscribe', subscribeAcademySubjectController);
router.get('/academy/subscriptions', getAcademySubscriptionsController);
router.get('/academy/checkout/verify', verifyAcademyCheckoutController);

export default router;
