import { Router } from 'express';

import { cancelPartyPaymentHandler } from '../controllers/cancellationController.js';
import {
  addParty,
  addPartyPayment,
  editParty,
  getParties,
  getParty,
  getReceivables,
} from '../controllers/partyController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getParties);
router.post('/', addParty);
router.get('/receivables', getReceivables);
router.get('/:id', getParty);
router.put('/:id', editParty);
router.post('/:id/payments', addPartyPayment);
router.post('/:id/payments/:paymentId/cancel', cancelPartyPaymentHandler);

export default router;
