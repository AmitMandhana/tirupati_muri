import {
  createProduction,
  getProductionSummary,
  listProductions,
} from '../services/productionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProductions = asyncHandler(async (req, res) => {
  const result = await listProductions(req.query);

  return res.status(200).json(result);
});

export const addProduction = asyncHandler(async (req, res) => {
  const { production, stock } = await createProduction(req.body);

  return res.status(201).json({
    message: 'Production recorded.',
    production,
    stock,
  });
});

export const getSummary = asyncHandler(async (req, res) => {
  const result = await getProductionSummary();

  return res.status(200).json(result);
});
