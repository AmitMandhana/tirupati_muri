import {
  getCashBook,
  getCashBookSummary,
  recordCashCount,
  updateOpeningCash,
} from '../services/cashBookService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDailyCashBook = asyncHandler(async (req, res) => {
  const cashBook = await getCashBook(req.query.date);

  return res.status(200).json(cashBook);
});

export const getSummary = asyncHandler(async (req, res) => {
  const summary = await getCashBookSummary();

  return res.status(200).json({ summary });
});

export const updateOpening = asyncHandler(async (req, res) => {
  const opening = await updateOpeningCash(req.body);

  return res.status(200).json({
    message: 'Opening cash saved.',
    opening,
  });
});

export const addCashCount = asyncHandler(async (req, res) => {
  const { count, cashBook } = await recordCashCount(req.body);

  return res.status(201).json({
    message: 'Physical cash recorded.',
    count,
    cashBook,
  });
});
