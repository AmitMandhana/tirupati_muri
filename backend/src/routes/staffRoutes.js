import { Router } from 'express';

import { cancelStaffTransactionHandler } from '../controllers/cancellationController.js';
import {
  addStaff,
  addStaffTransactionHandler,
  editStaff,
  getStaff,
  getStaffMember,
  getStaffSummaryHandler,
} from '../controllers/staffController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getStaff);
router.post('/', addStaff);
router.get('/summary', getStaffSummaryHandler);
router.get('/:id', getStaffMember);
router.put('/:id', editStaff);
router.post('/:id/transactions', addStaffTransactionHandler);
router.post('/:id/transactions/:transactionId/cancel', cancelStaffTransactionHandler);

export default router;
