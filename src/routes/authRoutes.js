import { Router } from 'express';
import { register, login,loginUserController } from '../controllers/authController.js';



const router = Router();

router.post('/organization/register',register);
router.post('/organization/login',login);
router.post('/user/login',loginUserController)


export default router;