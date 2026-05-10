import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  createAcademicYearController,
  listAcademicYearsController,
  getAcademicYearController,
  updateAcademicYearController,
} from '../controllers/academicYearController.js';
import {
  createTermController,
  listTermsController,
  getTermController,
  updateTermController,
  reopenTermController,
  listTermAuditLogsController,
} from '../controllers/termController.js';

const router = Router();

// Allow any authenticated user to read academic years/terms.
router.use(authMiddleware);

// Academic year endpoints
router.post('/', isOrganization, createAcademicYearController);
router.get('/', listAcademicYearsController);
router.get('/:yearId', getAcademicYearController);
router.patch('/:yearId', isOrganization, updateAcademicYearController);

// Term endpoints nested under academic year
router.post('/:yearId/terms', isOrganization, createTermController);
router.get('/:yearId/terms', listTermsController);
router.get('/:yearId/terms/:termId', getTermController);
router.patch('/:yearId/terms/:termId', isOrganization, updateTermController);
router.post('/:yearId/terms/:termId/reopen', isOrganization, reopenTermController);
router.get('/:yearId/terms/:termId/audit', isOrganization, listTermAuditLogsController);

export default router;
