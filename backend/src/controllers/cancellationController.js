import {
  cancelBankTransaction,
  cancelExpense,
  cancelInvoice,
  cancelPartyPayment,
  cancelProduction,
  cancelSale,
  cancelStaffTransaction,
} from '../services/cancellationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const cancelSaleHandler = asyncHandler(async (req, res) =>
  res.status(200).json(await cancelSale(req.params.id, req.body)),
);

export const cancelInvoiceHandler = asyncHandler(async (req, res) =>
  res.status(200).json(await cancelInvoice(req.params.id, req.body)),
);

export const cancelPartyPaymentHandler = asyncHandler(async (req, res) =>
  res.status(200).json(await cancelPartyPayment(req.params.paymentId, req.body)),
);

export const cancelExpenseHandler = asyncHandler(async (req, res) =>
  res.status(200).json(await cancelExpense(req.params.id, req.body)),
);

export const cancelStaffTransactionHandler = asyncHandler(async (req, res) =>
  res
    .status(200)
    .json(await cancelStaffTransaction(req.params.transactionId, req.body)),
);

export const cancelProductionHandler = asyncHandler(async (req, res) =>
  res.status(200).json(await cancelProduction(req.params.id, req.body)),
);

export const cancelBankTransactionHandler = asyncHandler(async (req, res) =>
  res
    .status(200)
    .json(await cancelBankTransaction(req.params.id, req.params.transactionId, req.body)),
);
