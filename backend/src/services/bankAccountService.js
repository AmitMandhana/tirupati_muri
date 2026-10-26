import mongoose from 'mongoose';

import { BankAccount } from '../models/BankAccount.js';
import {
  BANK_TRANSACTION_TYPES,
  BankTransaction,
  MANUAL_BANK_TRANSACTION_TYPES,
} from '../models/BankTransaction.js';
import {
  getNextBankTransactionNumber,
  getNextBankTransferNumber,
} from './billNumberService.js';
import { endOfLocalDay, parseDateOnly, startOfLocalDay } from '../utils/dates.js';
import { httpError } from '../utils/httpError.js';
import { toText } from '../utils/validators.js';

const MANUAL_DIRECTIONS = {
  deposit: 'inflow',
  withdrawal: 'outflow',
  'sales-collection': 'inflow',
  'party-payment': 'inflow',
  expense: 'outflow',
  'loan-receipt': 'inflow',
  'loan-repayment': 'outflow',
};

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);

const isEmpty = (value) => value === undefined || value === null || value === '';

const parseNonNegativeAmount = (value, label) => {
  const text = String(value ?? '').trim();
  const amount = Number(text);

  if (!text || !Number.isFinite(amount) || amount < 0) {
    throw httpError(400, `${label} must be a number of 0 or more.`);
  }

  return roundMoney(amount);
};

const parsePositiveAmount = (value, label) => {
  const text = String(value ?? '').trim();
  const amount = Number(text);

  if (!text || !Number.isFinite(amount) || amount <= 0) {
    throw httpError(400, `${label} must be greater than 0.`);
  }

  return roundMoney(amount);
};

const parseActive = (value, fallback) => {
  if (isEmpty(value)) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === 'false') {
    return value === 'true';
  }

  throw httpError(400, 'Active status must be true or false.');
};

const parseNotes = (value) => {
  const notes = toText(value);

  if (notes.length > 500) {
    throw httpError(400, 'Notes cannot be longer than 500 characters.');
  }

  return notes;
};

const parseDescription = (value) => {
  const description = toText(value);

  if (!description) {
    throw httpError(400, 'Description is required.');
  }

  if (description.length > 200) {
    throw httpError(400, 'Description cannot be longer than 200 characters.');
  }

  return description;
};

const normalizeAccountNumber = (value) =>
  String(value ?? '').replace(/[\s-]/g, '').toUpperCase();

const maskAccountNumber = (value) => {
  const text = String(value ?? '');

  if (text.length <= 4) {
    return '•'.repeat(Math.max(text.length, 4));
  }

  return `•••• ${text.slice(-4)}`;
};

const parseTransactionDate = (value, label = 'Transaction date') => {
  const date = parseDateOnly(value, label, { endOfDay: true });

  if (date > endOfLocalDay(new Date())) {
    throw httpError(400, `${label} cannot be in the future.`);
  }

  return date;
};

const validateAccountPayload = (body = {}, existing = null) => {
  const bankName = toText(body.bankName) || existing?.bankName || '';
  const accountName = toText(body.accountName) || existing?.accountName || '';
  const accountNumberInput = toText(body.accountNumber);
  const accountNumber = accountNumberInput
    ? normalizeAccountNumber(accountNumberInput)
    : existing?.accountNumber ?? '';

  if (!bankName) {
    throw httpError(400, 'Bank name is required.');
  }

  if (bankName.length > 100) {
    throw httpError(400, 'Bank name cannot be longer than 100 characters.');
  }

  if (!accountName) {
    throw httpError(400, 'Account name is required.');
  }

  if (accountName.length > 150) {
    throw httpError(400, 'Account name cannot be longer than 150 characters.');
  }

  if (!accountNumber) {
    throw httpError(400, 'Account number is required.');
  }

  if (!/^[A-Z0-9]{4,34}$/.test(accountNumber)) {
    throw httpError(
      400,
      'Account number must be 4 to 34 letters or digits (spaces and dashes are ignored).',
    );
  }

  const openingBalance = isEmpty(body.openingBalance)
    ? roundMoney(existing?.openingBalance ?? 0)
    : parseNonNegativeAmount(body.openingBalance, 'Opening balance');
  const active = parseActive(body.active, existing ? existing.active !== false : true);

  return { bankName, accountName, accountNumber, openingBalance, active };
};

const ensureUniqueAccountNumber = async (accountNumber, excludeId = null) => {
  const filter = { accountNumber };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const duplicate = await BankAccount.findOne(filter).lean();

  if (duplicate) {
    throw httpError(409, 'This account number is already in use.');
  }
};

const resolveAccount = async (accountId) => {
  if (!mongoose.isValidObjectId(accountId)) {
    throw httpError(404, 'Bank account not found.');
  }

  const account = await BankAccount.findById(accountId).lean();

  if (!account) {
    throw httpError(404, 'Bank account not found.');
  }

  return account;
};

export const resolveOptionalBankAccount = async (bankAccountId) => {
  const id =
    bankAccountId === undefined || bankAccountId === null ? '' : String(bankAccountId).trim();

  if (!id) {
    return null;
  }

  if (!mongoose.isValidObjectId(id)) {
    throw httpError(400, 'Select a valid bank account.');
  }

  const account = await BankAccount.findById(id).lean();

  if (!account) {
    throw httpError(400, 'Select a valid bank account.');
  }

  if (account.active === false) {
    throw httpError(400, 'This bank account is inactive. Reactivate it before using it.');
  }

  return account;
};

const zeroStats = {
  inflow: 0,
  outflow: 0,
  todayInflow: 0,
  todayOutflow: 0,
  transactionCount: 0,
  lastTransactionAt: null,
};

const toBalance = (openingBalance, stats) =>
  roundMoney((openingBalance ?? 0) + stats.inflow - stats.outflow);

const toAccountView = (account, stats = zeroStats) => ({
  _id: account._id,
  bankName: account.bankName,
  accountName: account.accountName,
  maskedAccountNumber: maskAccountNumber(account.accountNumber),
  openingBalance: roundMoney(account.openingBalance ?? 0),
  active: account.active !== false,
  balance: toBalance(account.openingBalance, stats),
  todayInflow: roundMoney(stats.todayInflow),
  todayOutflow: roundMoney(stats.todayOutflow),
  transactionCount: stats.transactionCount,
  lastTransactionAt: stats.lastTransactionAt ?? null,
  createdAt: account.createdAt,
});

const toTransactionView = (transaction, counterparty = null) => ({
  _id: transaction._id,
  transactionNumber: transaction.transactionNumber,
  reference: transaction.reference || transaction.transactionNumber,
  type: transaction.type,
  direction: transaction.direction,
  amount: roundMoney(transaction.amount),
  transactionDate: transaction.transactionDate,
  description: transaction.description,
  notes: transaction.notes ?? '',
  transferId: transaction.transferId ?? null,
  transferAccount: counterparty,
});

const buildStats = (row = {}) => ({
  inflow: roundMoney(row.inflow ?? 0),
  outflow: roundMoney(row.outflow ?? 0),
  todayInflow: roundMoney(row.todayInflow ?? 0),
  todayOutflow: roundMoney(row.todayOutflow ?? 0),
  transactionCount: row.count ?? 0,
  lastTransactionAt: row.lastTransactionAt ?? null,
});

const buildAggregateStages = () => {
  const todayStart = startOfLocalDay(new Date());
  const todayEnd = endOfLocalDay(new Date());

  return [
    {
      $group: {
        _id: '$bankAccount',
        inflow: {
          $sum: { $cond: [{ $eq: ['$direction', 'inflow'] }, '$amount', 0] },
        },
        outflow: {
          $sum: { $cond: [{ $eq: ['$direction', 'outflow'] }, '$amount', 0] },
        },
        todayInflow: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$direction', 'inflow'] },
                  { $gte: ['$transactionDate', todayStart] },
                  { $lte: ['$transactionDate', todayEnd] },
                ],
              },
              '$amount',
              0,
            ],
          },
        },
        todayOutflow: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$direction', 'outflow'] },
                  { $gte: ['$transactionDate', todayStart] },
                  { $lte: ['$transactionDate', todayEnd] },
                ],
              },
              '$amount',
              0,
            ],
          },
        },
        count: { $sum: 1 },
        lastTransactionAt: { $max: '$transactionDate' },
      },
    },
  ];
};

export const listBankAccounts = async () => {
  const [accounts, rows] = await Promise.all([
    BankAccount.find().sort({ active: -1, bankName: 1, accountName: 1, _id: 1 }).lean(),
    BankTransaction.aggregate(buildAggregateStages()),
  ]);

  const statsByAccount = new Map(rows.map((row) => [String(row._id), buildStats(row)]));
  const views = accounts.map((account) =>
    toAccountView(account, statsByAccount.get(String(account._id)) ?? zeroStats),
  );

  return {
    accounts: views,
    summary: {
      totalBalance: roundMoney(views.reduce((sum, account) => sum + account.balance, 0)),
      accountCount: views.length,
      activeCount: views.filter((account) => account.active).length,
      todayInflow: roundMoney(views.reduce((sum, account) => sum + account.todayInflow, 0)),
      todayOutflow: roundMoney(views.reduce((sum, account) => sum + account.todayOutflow, 0)),
    },
  };
};

export const createBankAccount = async (body = {}) => {
  const payload = validateAccountPayload(body);
  await ensureUniqueAccountNumber(payload.accountNumber);

  try {
    const account = await BankAccount.create(payload);
    return toAccountView(account);
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, 'This account number is already in use.');
    }

    throw error;
  }
};

export const updateBankAccount = async (accountId, body = {}) => {
  const existing = await resolveAccount(accountId);
  const payload = validateAccountPayload(body, existing);
  await ensureUniqueAccountNumber(payload.accountNumber, existing._id);

  try {
    const account = await BankAccount.findByIdAndUpdate(
      existing._id,
      { $set: payload },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    return toAccountView(account);
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, 'This account number is already in use.');
    }

    throw error;
  }
};

export const getBankAccountDetail = async (accountId) => {
  const account = await resolveAccount(accountId);
  const transactions = await BankTransaction.find({ bankAccount: account._id })
    .sort({ transactionDate: 1, createdAt: 1, _id: 1 })
    .lean();

  const counterpartyIds = [
    ...new Set(
      transactions
        .filter((transaction) => transaction.transferAccount)
        .map((transaction) => String(transaction.transferAccount)),
    ),
  ];
  const counterparties =
    counterpartyIds.length > 0
      ? await BankAccount.find({ _id: { $in: counterpartyIds } })
          .select('bankName accountName accountNumber')
          .lean()
      : [];
  const counterpartyById = new Map(counterparties.map((item) => [String(item._id), item]));

  const stats = {
    inflow: roundMoney(
      transactions
        .filter((transaction) => transaction.direction === 'inflow')
        .reduce((sum, transaction) => sum + (transaction.amount ?? 0), 0),
    ),
    outflow: roundMoney(
      transactions
        .filter((transaction) => transaction.direction === 'outflow')
        .reduce((sum, transaction) => sum + (transaction.amount ?? 0), 0),
    ),
    todayInflow: 0,
    todayOutflow: 0,
    transactionCount: transactions.length,
    lastTransactionAt: transactions.length > 0 ? transactions[transactions.length - 1].transactionDate : null,
  };

  const todayStart = startOfLocalDay(new Date()).getTime();
  const todayEnd = endOfLocalDay(new Date()).getTime();

  const ledger = [
    {
      id: 'opening',
      type: 'opening',
      direction: 'opening',
      date: account.createdAt,
      reference: 'Opening',
      description: 'Opening balance',
      in: 0,
      out: 0,
      balance: roundMoney(account.openingBalance ?? 0),
      notes: '',
      transferAccount: null,
    },
  ];

  let runningBalance = roundMoney(account.openingBalance ?? 0);

  transactions.forEach((transaction) => {
    const amount = roundMoney(transaction.amount ?? 0);
    const time = new Date(transaction.transactionDate).getTime();

    if (time >= todayStart && time <= todayEnd) {
      if (transaction.direction === 'inflow') {
        stats.todayInflow = roundMoney(stats.todayInflow + amount);
      } else {
        stats.todayOutflow = roundMoney(stats.todayOutflow + amount);
      }
    }

    runningBalance = roundMoney(
      runningBalance + (transaction.direction === 'inflow' ? amount : -amount),
    );

    const counterparty = transaction.transferAccount
      ? counterpartyById.get(String(transaction.transferAccount))
      : null;

    ledger.push({
      id: String(transaction._id),
      type: transaction.type,
      direction: transaction.direction,
      date: transaction.transactionDate,
      reference: transaction.reference || transaction.transactionNumber,
      description: transaction.description,
      in: transaction.direction === 'inflow' ? amount : 0,
      out: transaction.direction === 'outflow' ? amount : 0,
      balance: runningBalance,
      notes: transaction.notes ?? '',
      transferAccount: counterparty
        ? {
            _id: counterparty._id,
            label: `${counterparty.bankName} · ${maskAccountNumber(counterparty.accountNumber)}`,
          }
        : null,
    });
  });

  return {
    account: toAccountView(account, stats),
    summary: {
      openingBalance: roundMoney(account.openingBalance ?? 0),
      balance: runningBalance,
      inflow: stats.inflow,
      outflow: stats.outflow,
      todayInflow: stats.todayInflow,
      todayOutflow: stats.todayOutflow,
      transactionCount: stats.transactionCount,
      lastTransactionAt: stats.lastTransactionAt,
    },
    ledger,
  };
};

export const recordBankMovement = async ({
  bankAccountId,
  type,
  direction,
  amount,
  transactionDate,
  description,
  reference = '',
  notes = '',
}) => {
  if (!BANK_TRANSACTION_TYPES.includes(type)) {
    throw httpError(400, 'Select a valid bank transaction type.');
  }

  if (direction !== 'inflow' && direction !== 'outflow') {
    throw httpError(400, 'Bank transaction direction must be inflow or outflow.');
  }

  const account = await resolveOptionalBankAccount(bankAccountId);

  if (!account) {
    throw httpError(400, 'A bank account is required.');
  }

  const normalizedAmount = parsePositiveAmount(amount, 'Transaction amount');
  const date = transactionDate
    ? endOfLocalDay(transactionDate)
    : endOfLocalDay(new Date());

  if (date > endOfLocalDay(new Date())) {
    throw httpError(400, 'Transaction date cannot be in the future.');
  }

  const normalizedDescription = parseDescription(description);
  const normalizedNotes = parseNotes(notes);
  const normalizedReference = toText(reference);

  if (normalizedReference.length > 60) {
    throw httpError(400, 'Reference cannot be longer than 60 characters.');
  }

  const transactionNumber = await getNextBankTransactionNumber();

  return BankTransaction.create({
    transactionNumber,
    bankAccount: account._id,
    type,
    direction,
    amount: normalizedAmount,
    transactionDate: date,
    description: normalizedDescription,
    notes: normalizedNotes,
    reference: normalizedReference || transactionNumber,
  });
};

export const createBankTransaction = async (accountId, body = {}) => {
  const account = await resolveAccount(accountId);

  if (account.active === false) {
    throw httpError(
      400,
      'This bank account is inactive. Reactivate it before recording transactions.',
    );
  }

  const type = toText(body.type).toLowerCase();

  if (!MANUAL_BANK_TRANSACTION_TYPES.includes(type)) {
    throw httpError(
      400,
      'Transaction type must be deposit, withdrawal, sales collection, party payment, expense, loan receipt, loan repayment or other.',
    );
  }

  let direction = MANUAL_DIRECTIONS[type];

  if (!direction) {
    direction = toText(body.direction).toLowerCase();

    if (direction !== 'inflow' && direction !== 'outflow') {
      throw httpError(400, 'Choose whether the other transaction is money in or money out.');
    }
  }

  const amount = parsePositiveAmount(body.amount, 'Transaction amount');
  const transactionDate = parseTransactionDate(body.transactionDate);
  const description = parseDescription(body.description);
  const notes = parseNotes(body.notes);
  const transactionNumber = await getNextBankTransactionNumber();

  const transaction = await BankTransaction.create({
    transactionNumber,
    bankAccount: account._id,
    type,
    direction,
    amount,
    transactionDate,
    description,
    notes,
    reference: transactionNumber,
  });

  return toTransactionView(transaction);
};

export const transferBetweenAccounts = async (body = {}) => {
  const fromAccount = await resolveOptionalBankAccount(body.fromAccountId);

  if (!fromAccount) {
    throw httpError(400, 'Select the account to transfer from.');
  }

  const toAccount = await resolveOptionalBankAccount(body.toAccountId);

  if (!toAccount) {
    throw httpError(400, 'Select the account to transfer to.');
  }

  if (String(fromAccount._id) === String(toAccount._id)) {
    throw httpError(400, 'Choose two different bank accounts for the transfer.');
  }

  const amount = parsePositiveAmount(body.amount, 'Transfer amount');
  const transactionDate = parseTransactionDate(body.transactionDate, 'Transfer date');
  const notes = parseNotes(body.notes);
  const transferNumber = await getNextBankTransferNumber();
  const transferId = new mongoose.Types.ObjectId();
  const fromTransactionNumber = await getNextBankTransactionNumber();
  const toTransactionNumber = await getNextBankTransactionNumber();
  const fromLabel = `${fromAccount.bankName} · ${maskAccountNumber(fromAccount.accountNumber)}`;
  const toLabel = `${toAccount.bankName} · ${maskAccountNumber(toAccount.accountNumber)}`;

  let outflow;

  try {
    outflow = await BankTransaction.create({
      transactionNumber: fromTransactionNumber,
      bankAccount: fromAccount._id,
      type: 'transfer',
      direction: 'outflow',
      amount,
      transactionDate,
      description: `Transfer to ${toLabel}`,
      notes,
      reference: transferNumber,
      transferId,
      transferAccount: toAccount._id,
    });

    await BankTransaction.create({
      transactionNumber: toTransactionNumber,
      bankAccount: toAccount._id,
      type: 'transfer',
      direction: 'inflow',
      amount,
      transactionDate,
      description: `Transfer from ${fromLabel}`,
      notes,
      reference: transferNumber,
      transferId,
      transferAccount: fromAccount._id,
    });
  } catch (error) {
    if (outflow) {
      await BankTransaction.deleteOne({ _id: outflow._id });
    }

    throw error;
  }

  return {
    transferNumber,
    transferId,
    amount,
    transactionDate,
    from: { _id: fromAccount._id, label: fromLabel },
    to: { _id: toAccount._id, label: toLabel },
    description: `Transfer ${fromLabel} → ${toLabel}`,
  };
};
