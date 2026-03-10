import { Router } from 'express';
import { getAllOrganizations, getOrganizationById, createOrganization, updateOrganization, deleteOrganization } from '../controllers/organizationController.js';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', getAllOrganizations);
router.get('/:id', getOrganizationById);
router.post('/', createOrganization);
router.put('/:id', authenticate, updateOrganization);
router.delete('/:id', authenticate, authorizeRoles('Admin'), deleteOrganization);

export default router;
