import { listCancelledTransactions } from '../services/auditService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCancelledTransactions = asyncHandler(async (req, res) => {
  const audit = await listCancelledTransactions(req.query);

  return res.status(200).json({ audit });
});
