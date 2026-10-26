import { Router } from 'express';

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

export default router;
