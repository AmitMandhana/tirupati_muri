import { Router } from 'express';

import {
  createOpeningStock,
  createStockMovement,
  getLedger,
  listStock,
} from '../controllers/stockController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listStock);
router.post('/opening', createOpeningStock);
router.post('/movements', createStockMovement);
router.get('/:productId/ledger', getLedger);

export default router;
