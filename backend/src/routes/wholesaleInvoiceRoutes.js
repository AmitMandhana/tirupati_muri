import { Router } from 'express';

import { cancelInvoiceHandler } from '../controllers/cancellationController.js';
import {
  createInvoice,
  getInvoice,
  listInvoices,
} from '../controllers/wholesaleInvoiceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.post('/:id/cancel', cancelInvoiceHandler);

export default router;
