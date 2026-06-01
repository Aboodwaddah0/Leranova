import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import * as ctrl from '../controllers/timetableController.js';

const router = Router();

router.use(authMiddleware);

// Any authenticated user can get their own timetable (role-aware)
router.get('/me', ctrl.getMyTimetableController);

// Org-only CRUD
router.get('/',     isOrganization, ctrl.listSlotsController);
router.post('/',    isOrganization, ctrl.createSlotController);
router.put('/:id',  isOrganization, ctrl.updateSlotController);
router.delete('/:id', isOrganization, ctrl.deleteSlotController);

export default router;
