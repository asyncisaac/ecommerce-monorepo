import { Router } from 'express';
import { authController } from './auth.controllers.js';

const router = Router();

// Rotas públicas
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));

export const authRoutes = router;