import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  schoolAcademicReportController,
  schoolAttendanceReportController,
  schoolClassPerformanceReportController,
  schoolSubjectAnalyticsReportController,
  schoolParentNotesReportController,
  schoolTermSummaryReportController,
  academyEnrollmentReportController,
  academyProgressReportController,
  academyQuizReportController,
  academyRevenueReportController,
  academyCompletionReportController,
} from '../controllers/reportController.js';

const router = Router();

router.use(authMiddleware, isOrganization);

// ── School reports ───────────────────────────────────────────────────────────
router.get('/school/academic',          schoolAcademicReportController);
router.get('/school/attendance',        schoolAttendanceReportController);
router.get('/school/class-performance', schoolClassPerformanceReportController);
router.get('/school/subject-analytics', schoolSubjectAnalyticsReportController);
router.get('/school/parent-notes',      schoolParentNotesReportController);
router.get('/school/term-summary',      schoolTermSummaryReportController);

// ── Academy reports ──────────────────────────────────────────────────────────
router.get('/academy/enrollment',  academyEnrollmentReportController);
router.get('/academy/progress',    academyProgressReportController);
router.get('/academy/quiz',        academyQuizReportController);
router.get('/academy/revenue',     academyRevenueReportController);
router.get('/academy/completion',  academyCompletionReportController);

export default router;
