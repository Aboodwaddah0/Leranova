import { Router } from 'express';
import {
	createOrganizationController,
	getAllOrganizationsController,
	getOrganizationByIdController,
	getOwnOrganizationController,
	getOwnOrganizationRevenueController,
	updateOrganizationController,
	updateOwnOrganizationController,
	deleteOrganizationController,
} from '../controllers/organizationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import { isOrganization } from '../middlewares/isOrganization.js';

const router = Router();

router.get('/me', authMiddleware, isOrganization, getOwnOrganizationController);
router.patch('/me', authMiddleware, isOrganization, updateOwnOrganizationController);
router.get('/me/revenue', authMiddleware, isOrganization, getOwnOrganizationRevenueController);

router.use(authMiddleware, isAdmin);

router.post('/', createOrganizationController);
router.get('/', getAllOrganizationsController);
router.get('/:id', getOrganizationByIdController);
router.patch('/:id', updateOrganizationController);
router.delete('/:id', deleteOrganizationController);

export default router;
