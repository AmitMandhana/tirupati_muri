import { Router } from 'express';

import { getCancelledTransactions } from '../controllers/auditController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/cancelled', getCancelledTransactions);

export default router;
