import { Router } from 'express';

import { cancelSaleHandler } from '../controllers/cancellationController.js';
import {
  createSale,
  getSale,
  getSalesSummary,
  listSales,
} from '../controllers/saleController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listSales);
router.post('/', createSale);
router.get('/summary', getSalesSummary);
router.get('/:id', getSale);
router.post('/:id/cancel', cancelSaleHandler);

export default router;
