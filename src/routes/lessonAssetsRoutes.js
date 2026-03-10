import { Router } from 'express';
import { getAssetsByLesson, getAssetById, createAsset, updateAsset, deleteAsset } from '../controllers/lessonAssetsController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/lesson/:lessonId', getAssetsByLesson);
router.get('/:id', getAssetById);
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

export default router;
