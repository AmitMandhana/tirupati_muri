import mongoose from 'mongoose';

import { Sale } from '../models/Sale.js';
import { createRetailSale } from '../services/saleService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { toText } from '../utils/validators.js';

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const summarizeFrom = async (from) => {
  const [row] = await Sale.aggregate([
    { $match: { saleType: 'retail', createdAt: { $gte: from } } },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    total: roundMoney(row?.total ?? 0),
    count: row?.count ?? 0,
  };
};

export const createSale = asyncHandler(async (req, res) => {
  const { sale, stock } = await createRetailSale(req.body);

  return res.status(201).json({
    message: 'Sale completed.',
    sale,
    stock,
  });
});

export const listSales = asyncHandler(async (req, res) => {
  const saleType = toText(req.query.type) || 'retail';

  if (!['retail', 'wholesale'].includes(saleType)) {
    throw httpError(400, 'Sale type must be retail or wholesale.');
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 20;

  const sales = await Sale.find({ saleType })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  return res.status(200).json({ sales });
});

export const getSalesSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, month] = await Promise.all([
    summarizeFrom(startOfToday),
    summarizeFrom(startOfMonth),
  ]);

  return res.status(200).json({ summary: { today, month } });
});

export const getSale = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw httpError(404, 'Sale not found.');
  }

  const sale = await Sale.findById(req.params.id).lean();

  if (!sale) {
    throw httpError(404, 'Sale not found.');
  }

  return res.status(200).json({ sale });
});
