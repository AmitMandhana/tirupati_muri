import { Router } from 'express';

import { cancelBankTransactionHandler } from '../controllers/cancellationController.js';
import {
  addBankAccount,
  addBankTransaction,
  editBankAccount,
  getBankAccount,
  getBankAccounts,
  transferFunds,
} from '../controllers/bankAccountController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getBankAccounts);
router.post('/', addBankAccount);
router.post('/transfer', transferFunds);
router.get('/:id', getBankAccount);
router.put('/:id', editBankAccount);
router.post('/:id/transactions', addBankTransaction);
router.post('/:id/transactions/:transactionId/cancel', cancelBankTransactionHandler);

export default router;
