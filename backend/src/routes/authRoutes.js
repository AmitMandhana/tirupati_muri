import { Router } from 'express';

import {
  getCurrentUser,
  loginUser,
  setupInitialUser,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/setup', setupInitialUser);
router.post('/login', loginUser);
router.get('/me', requireAuth, getCurrentUser);

export default router;
