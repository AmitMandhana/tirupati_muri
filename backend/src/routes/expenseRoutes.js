import { Router } from 'express';

import {
  addExpense,
  addExpenseCategory,
  getExpenseCategories,
  getExpenses,
} from '../controllers/expenseController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/categories', getExpenseCategories);
router.post('/categories', addExpenseCategory);
router.get('/', getExpenses);
router.post('/', addExpense);

export default router;
