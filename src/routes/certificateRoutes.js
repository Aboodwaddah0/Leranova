import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isStudent } from '../middlewares/isStudent.js';
import {
  listCertificatesController,
  academyEligibilityController,
  claimAcademyCertificateController,
  studentSchoolCertificateController,
} from '../controllers/certificateController.js';

const router = Router();

router.use(authMiddleware, isStudent);

router.get('/', listCertificatesController);
router.get('/school-certificate', studentSchoolCertificateController);
router.get('/academy/eligibility/:subjectId', academyEligibilityController);
router.post('/academy/claim/:subjectId', claimAcademyCertificateController);

export default router;
