import mongoose from 'mongoose';

import { Expense, EXPENSE_ACCOUNTS, EXPENSE_PAYMENT_METHODS } from '../models/Expense.js';
import { ExpenseCategory } from '../models/ExpenseCategory.js';
import { getNextExpenseNumber } from './billNumberService.js';
import { recordBankMovement, resolveOptionalBankAccount } from './bankAccountService.js';
import { endOfLocalDay, parseDateOnly } from '../utils/dates.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegExp, toText } from '../utils/validators.js';

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);

const parseAmount = (value) => {
  const text = String(value ?? '').trim();
  const amount = Number(text);

  if (!text || !Number.isFinite(amount) || amount <= 0) {
    throw httpError(400, 'Expense amount must be greater than 0.');
  }

  return roundMoney(amount);
};

const parseNotes = (value) => {
  const notes = toText(value);

  if (notes.length > 500) {
    throw httpError(400, 'Notes cannot be longer than 500 characters.');
  }

  return notes;
};

const toCategoryView = (category) => ({
  _id: category._id,
  name: category.name,
  nameKey: category.nameKey,
  sortOrder: category.sortOrder ?? 999,
});

const toExpenseView = (expense) => ({
  _id: expense._id,
  expenseNumber: expense.expenseNumber,
  categoryId: expense.category,
  category: expense.categoryName,
  categoryKey: expense.categoryKey,
  amount: roundMoney(expense.amount),
  paymentMethod: expense.paymentMethod,
  account: expense.account,
  bankAccount: expense.bankAccount ?? null,
  expenseDate: expense.expenseDate,
  description: expense.description,
  notes: expense.notes ?? '',
  createdAt: expense.createdAt,
});

const resolveCategory = async (body) => {
  const categoryId = toText(body.categoryId);

  if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) {
      throw httpError(400, 'Select a valid expense category.');
    }

    const category = await ExpenseCategory.findById(categoryId).lean();

    if (!category) {
      throw httpError(400, 'Select a valid expense category.');
    }

    return category;
  }

  const name = toText(body.category);

  if (!name) {
    throw httpError(400, 'Expense category is required.');
  }

  const category = await ExpenseCategory.findOne({ nameKey: name.toLowerCase() }).lean();

  if (!category) {
    throw httpError(400, 'Select a valid expense category.');
  }

  return category;
};

const parseExpenseDate = (value) => {
  const expenseDate = parseDateOnly(value, 'Expense date');

  if (expenseDate > endOfLocalDay(new Date())) {
    throw httpError(400, 'Expense date cannot be in the future.');
  }

  return expenseDate;
};

const parseAccount = (paymentMethod, accountInput) => {
  const account = toText(accountInput).toLowerCase() || (paymentMethod === 'cash' ? 'cash' : 'bank');

  if (!EXPENSE_ACCOUNTS.includes(account)) {
    throw httpError(400, 'Cash or bank account is required.');
  }

  if (paymentMethod === 'cash' && account !== 'cash') {
    throw httpError(400, 'Cash expenses must be paid from the cash account.');
  }

  if (paymentMethod !== 'cash' && account !== 'bank') {
    throw httpError(400, 'UPI and bank expenses must be paid from the bank account.');
  }

  return account;
};

export const listExpenseCategories = async () => {
  const categories = await ExpenseCategory.find()
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return { categories: categories.map(toCategoryView) };
};

export const createExpenseCategory = async (body = {}) => {
  const name = toText(body.name);

  if (!name) {
    throw httpError(400, 'Category name is required.');
  }

  if (name.length > 60) {
    throw httpError(400, 'Category name cannot be longer than 60 characters.');
  }

  const nameKey = name.toLowerCase();
  const existing = await ExpenseCategory.findOne({ nameKey }).lean();

  if (existing) {
    throw httpError(409, 'This expense category already exists.');
  }

  try {
    const category = await ExpenseCategory.create({ name, nameKey, sortOrder: 999 });
    return toCategoryView(category);
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, 'This expense category already exists.');
    }

    throw error;
  }
};

export const createExpense = async (body = {}) => {
  const category = await resolveCategory(body);
  const amount = parseAmount(body.amount);
  const paymentMethod = toText(body.paymentMethod).toLowerCase();

  if (!EXPENSE_PAYMENT_METHODS.includes(paymentMethod)) {
    throw httpError(400, 'Payment method must be cash, upi or bank.');
  }

  const account = parseAccount(paymentMethod, body.account);
  const expenseDate = parseExpenseDate(body.expenseDate);
  const description = toText(body.description);

  if (!description) {
    throw httpError(400, 'Expense description is required.');
  }

  if (description.length > 200) {
    throw httpError(400, 'Description cannot be longer than 200 characters.');
  }

  const notes = parseNotes(body.notes);
  const bankAccount = account === 'bank' ? await resolveOptionalBankAccount(body.bankAccountId) : null;
  const expenseNumber = await getNextExpenseNumber();

  let expense;

  try {
    expense = await Expense.create({
      expenseNumber,
      category: category._id,
      categoryKey: category.nameKey,
      categoryName: category.name,
      amount,
      paymentMethod,
      account,
      bankAccount: bankAccount?._id ?? null,
      expenseDate,
      description,
      notes,
    });

    if (bankAccount) {
      await recordBankMovement({
        bankAccountId: bankAccount._id,
        type: 'expense',
        direction: 'outflow',
        amount,
        transactionDate: expenseDate,
        description: `Expense · ${description}`,
        reference: expenseNumber,
        notes,
      });
    }
  } catch (error) {
    if (expense) {
      await Expense.deleteOne({ _id: expense._id });
    }

    throw error;
  }

  return toExpenseView(expense);
};

const buildExpenseFilters = ({ search, category, from, to } = {}) => {
  const filters = {};
  const term = toText(search);

  if (term) {
    const pattern = new RegExp(escapeRegExp(term), 'i');
    filters.$or = [
      { expenseNumber: pattern },
      { categoryName: pattern },
      { description: pattern },
      { notes: pattern },
    ];
  }

  const categoryKey = toText(category).toLowerCase();

  if (categoryKey) {
    filters.categoryKey = categoryKey;
  }

  const fromText = toText(from);
  const toTextValue = toText(to);
  const fromDate = fromText ? parseDateOnly(fromText, 'From date') : null;
  const toDate = toTextValue ? parseDateOnly(toTextValue, 'To date', { endOfDay: true }) : null;

  if (fromDate && toDate && fromDate > toDate) {
    throw httpError(400, 'The from date cannot be after the to date.');
  }

  if (fromDate || toDate) {
    filters.expenseDate = {
      ...(fromDate ? { $gte: fromDate } : {}),
      ...(toDate ? { $lte: toDate } : {}),
    };
  }

  return filters;
};

export const listExpenses = async (query = {}) => {
  const filters = buildExpenseFilters(query);

  const [expenses, rows] = await Promise.all([
    Expense.find(filters).sort({ expenseDate: -1, createdAt: -1, _id: -1 }).limit(200).lean(),
    Expense.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          cash: { $sum: { $cond: [{ $eq: ['$account', 'cash'] }, '$amount', 0] } },
          bank: { $sum: { $cond: [{ $eq: ['$account', 'bank'] }, '$amount', 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const row = rows[0];

  return {
    expenses: expenses.map(toExpenseView),
    summary: {
      total: roundMoney(row?.total ?? 0),
      cash: roundMoney(row?.cash ?? 0),
      bank: roundMoney(row?.bank ?? 0),
      count: row?.count ?? 0,
    },
  };
};
