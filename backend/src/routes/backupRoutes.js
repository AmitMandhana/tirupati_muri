import { Router } from 'express';

import { exportData, listDatasets } from '../controllers/backupController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/datasets', listDatasets);
router.get('/export', exportData);

export default router;
