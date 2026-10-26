import { Router } from 'express';

import {
  addCashCount,
  getDailyCashBook,
  getSummary,
  updateOpening,
} from '../controllers/cashBookController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', getSummary);
router.put('/opening', updateOpening);
router.post('/counts', addCashCount);
router.get('/', getDailyCashBook);

export default router;
