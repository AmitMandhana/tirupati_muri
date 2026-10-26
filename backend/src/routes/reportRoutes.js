import { Router } from 'express';

import { getReportHandler } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/:report', getReportHandler);

export default router;
