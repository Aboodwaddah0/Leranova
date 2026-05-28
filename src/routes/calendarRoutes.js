import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import * as ctrl from '../controllers/calendarController.js';

const router = Router();

router.use(authMiddleware, isOrganization);

router.get('/', ctrl.listEventsController);
router.post('/', ctrl.createEventController);
router.get('/:id', ctrl.getEventController);
router.patch('/:id', ctrl.updateEventController);
router.delete('/:id', ctrl.deleteEventController);

export default router;
