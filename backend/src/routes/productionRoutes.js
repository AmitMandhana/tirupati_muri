import { Router } from 'express';

import { cancelProductionHandler } from '../controllers/cancellationController.js';
import {
  addProduction,
  getProductions,
  getSummary,
} from '../controllers/productionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getProductions);
router.post('/', addProduction);
router.get('/summary', getSummary);
router.post('/:id/cancel', cancelProductionHandler);

export default router;
