import { Router } from 'express';
import {
	createOrganizationController,
	getAllOrganizationsController,
	getOrganizationByIdController,
	updateOrganizationController,
	deleteOrganizationController,
} from '../controllers/organizationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/isAdmin.js';

const router = Router();

router.use(authMiddleware, isAdmin);

router.post('/', createOrganizationController);
router.get('/', getAllOrganizationsController);
router.get('/:id', getOrganizationByIdController);
router.patch('/:id', updateOrganizationController);
router.delete('/:id', deleteOrganizationController);

export default router;
