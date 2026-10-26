import {
  getStockLedger,
  getStockOverview,
  recordManualMovement,
  recordOpeningStock,
} from '../services/stockService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

const parseLedgerLimit = (value) => {
  if (value === undefined) {
    return 50;
  }

  const limit = Number.parseInt(value, 10);

  if (!Number.isInteger(limit) || limit < 1) {
    throw httpError(400, 'Ledger limit must be a positive number.');
  }

  return limit;
};

export const listStock = asyncHandler(async (req, res) => {
  const overview = await getStockOverview();

  return res.status(200).json(overview);
});

export const getLedger = asyncHandler(async (req, res) => {
  const ledger = await getStockLedger(req.params.productId, parseLedgerLimit(req.query.limit));

  return res.status(200).json(ledger);
});

export const createOpeningStock = asyncHandler(async (req, res) => {
  const result = await recordOpeningStock(req.body);

  return res.status(201).json({
    message: 'Opening stock recorded.',
    ...result,
  });
});

export const createStockMovement = asyncHandler(async (req, res) => {
  const result = await recordManualMovement(req.body);

  return res.status(201).json({
    message: 'Stock updated.',
    ...result,
  });
});
