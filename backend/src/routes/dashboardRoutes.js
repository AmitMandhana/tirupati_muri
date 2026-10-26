import { Router } from 'express';

import { getDashboardHandler } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', getDashboardHandler);

export default router;
