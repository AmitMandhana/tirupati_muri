import {
  createExpense,
  createExpenseCategory,
  listExpenseCategories,
  listExpenses,
} from '../services/expenseService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getExpenses = asyncHandler(async (req, res) => {
  const result = await listExpenses(req.query);

  return res.status(200).json(result);
});

export const addExpense = asyncHandler(async (req, res) => {
  const expense = await createExpense(req.body);

  return res.status(201).json({
    message: 'Expense recorded.',
    expense,
  });
});

export const getExpenseCategories = asyncHandler(async (req, res) => {
  const result = await listExpenseCategories();

  return res.status(200).json(result);
});

export const addExpenseCategory = asyncHandler(async (req, res) => {
  const category = await createExpenseCategory(req.body);

  return res.status(201).json({
    message: 'Category added.',
    category,
  });
});
