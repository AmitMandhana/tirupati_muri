import { Router } from 'express';

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

export default router;
