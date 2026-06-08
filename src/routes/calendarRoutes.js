import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import * as ctrl from '../controllers/calendarController.js';

const router = Router();

// Org-only routes
router.get('/',    authMiddleware, isOrganization, ctrl.listEventsController);
router.post('/',   authMiddleware, isOrganization, ctrl.createEventController);
router.get('/:id', authMiddleware, isOrganization, ctrl.getEventController);
router.patch('/:id',  authMiddleware, isOrganization, ctrl.updateEventController);
router.delete('/:id', authMiddleware, isOrganization, ctrl.deleteEventController);

export default router;
