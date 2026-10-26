import { Router } from 'express';

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

export default router;
