import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  createAcademicYearController,
  listAcademicYearsController,
  getAcademicYearController,
  updateAcademicYearController,
  activateAcademicYearController,
  deleteAcademicYearController,
} from '../controllers/academicYearController.js';
import {
  createTermController,
  listTermsController,
  getTermController,
  updateTermController,
  reopenTermController,
  activateTermController,
  listTermAuditLogsController,
} from '../controllers/termController.js';
import {
  orgTermCertificatesController,
  issueCertificatesController,
  publishCertificatesController,
  unpublishCertificatesController,
  certStatusController,
} from '../controllers/certificateController.js';

const router = Router();

// Allow any authenticated user to read academic years/terms.
router.use(authMiddleware);

// Academic year endpoints
router.post('/', isOrganization, createAcademicYearController);
router.get('/', listAcademicYearsController);
router.get('/:yearId', getAcademicYearController);
router.patch('/:yearId', isOrganization, updateAcademicYearController);
router.post('/:yearId/activate', isOrganization, activateAcademicYearController);
router.delete('/:yearId', isOrganization, deleteAcademicYearController);

// Term endpoints nested under academic year
router.post('/:yearId/terms', isOrganization, createTermController);
router.get('/:yearId/terms', listTermsController);
router.get('/:yearId/terms/:termId', getTermController);
router.patch('/:yearId/terms/:termId', isOrganization, updateTermController);
router.post('/:yearId/terms/:termId/activate', isOrganization, activateTermController);
router.post('/:yearId/terms/:termId/reopen', isOrganization, reopenTermController);
router.get('/:yearId/terms/:termId/audit', isOrganization, listTermAuditLogsController);

// Certificate routes for a term (org admin)
router.get('/:yearId/terms/:termId/certificates',          isOrganization, orgTermCertificatesController);
router.post('/:yearId/terms/:termId/certificates/generate', isOrganization, orgTermCertificatesController);
router.get('/:yearId/terms/:termId/certificates/status',   isOrganization, certStatusController);
router.post('/:yearId/terms/:termId/certificates/issue',   isOrganization, issueCertificatesController);
router.post('/:yearId/terms/:termId/certificates/publish',   isOrganization, publishCertificatesController);
router.post('/:yearId/terms/:termId/certificates/unpublish', isOrganization, unpublishCertificatesController);

export default router;
