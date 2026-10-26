import { BusinessSettings } from '../models/BusinessSettings.js';
import { CashAdjustment } from '../models/CashAdjustment.js';
import { CashCount } from '../models/CashCount.js';
import { Expense } from '../models/Expense.js';
import { PartyPayment } from '../models/PartyPayment.js';
import { Sale } from '../models/Sale.js';
import { STAFF_PAYMENT_TYPES, StaffTransaction } from '../models/StaffTransaction.js';
import { WholesaleInvoice } from '../models/WholesaleInvoice.js';
import {
  getNextCashAdjustmentNumber,
  getNextCashClosingNumber,
} from './billNumberService.js';
import {
  endOfLocalDay,
  getTodayDateKey,
  parseDateOnly,
  startOfLocalDay,
} from '../utils/dates.js';
import { httpError } from '../utils/httpError.js';
import { toText } from '../utils/validators.js';

const STAFF_CATEGORY_KEY = 'salary';
const LOAN_CATEGORY_KEY = 'loan interest';

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);

const parseNonNegativeAmount = (value, label) => {
  const text = String(value ?? '').trim();
  const amount = Number(text);

  if (!text || !Number.isFinite(amount) || amount < 0) {
    throw httpError(400, `${label} must be a number of 0 or more.`);
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

const parseReason = (value) => {
  const reason = toText(value);

  if (reason.length > 300) {
    throw httpError(400, 'Reason cannot be longer than 300 characters.');
  }

  return reason;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const text = String(value).toLowerCase();

  if (text === 'true') {
    return true;
  }

  if (text === 'false') {
    return false;
  }

  throw httpError(400, 'Adjust cash book must be true or false.');
};

const toCountView = (count) => ({
  _id: count._id,
  closingNumber: count.closingNumber ?? '',
  countDate: count.countDate,
  expectedCash: roundMoney(count.expectedCash),
  physicalCash: roundMoney(count.physicalCash),
  difference: roundMoney(count.difference),
  adjusted: count.adjusted === true,
  reason: count.reason ?? '',
  notes: count.notes ?? '',
  countedAt: count.countedAt,
});

const getOpeningConfig = async () => {
  const settings = await BusinessSettings.findOne().lean();

  return {
    balance: roundMoney(settings?.cashOpeningBalance ?? 0),
    date: settings?.cashOpeningDate ? startOfLocalDay(settings.cashOpeningDate) : null,
  };
};

const dateRange = (from, before) => ({
  ...(from ? { $gte: from } : {}),
  ...(before ? { $lt: before } : {}),
});

const getPriorCashFlow = async (from, before) => {
  const range = dateRange(from, before);

  const [retailRows, wholesaleRows, paymentRows, expenseRows, adjustmentRows, staffRows] =
    await Promise.all([
    Sale.aggregate([
      {
        $match: {
          saleType: 'retail',
          paymentMethod: 'cash',
          amount: { $gt: 0 },
          createdAt: range,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    WholesaleInvoice.aggregate([
      { $match: { paymentMethod: 'cash', paid: { $gt: 0 }, createdAt: range } },
      { $group: { _id: null, total: { $sum: '$paid' } } },
    ]),
    PartyPayment.aggregate([
      { $match: { account: 'cash', paymentDate: range } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { account: 'cash', expenseDate: range } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          staff: {
            $sum: {
              $cond: [{ $eq: ['$categoryKey', STAFF_CATEGORY_KEY] }, '$amount', 0],
            },
          },
          loan: {
            $sum: {
              $cond: [{ $eq: ['$categoryKey', LOAN_CATEGORY_KEY] }, '$amount', 0],
            },
          },
        },
      },
    ]),
    CashAdjustment.aggregate([
      { $match: { adjustmentDate: range } },
      {
        $group: {
          _id: null,
          income: {
            $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] },
          },
          outflow: {
            $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] },
          },
        },
      },
    ]),
    StaffTransaction.aggregate([
      {
        $match: {
          account: 'cash',
          type: { $in: STAFF_PAYMENT_TYPES },
          transactionDate: range,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const expenseRow = expenseRows[0] ?? {};
  const adjustmentRow = adjustmentRows[0] ?? {};
  const cashStaffPayments = roundMoney(staffRows[0]?.total ?? 0);
  const staffPayments = roundMoney((expenseRow.staff ?? 0) + cashStaffPayments);
  const loanPayments = roundMoney(expenseRow.loan ?? 0);
  const totalCashExpenses = roundMoney(expenseRow.total ?? 0);
  const cashSales = roundMoney(
    (retailRows[0]?.total ?? 0) + (wholesaleRows[0]?.total ?? 0),
  );
  const partyCollections = roundMoney(paymentRows[0]?.total ?? 0);
  const otherIncome = roundMoney(adjustmentRow.income ?? 0);
  const otherOutflows = roundMoney(adjustmentRow.outflow ?? 0);

  return {
    net: roundMoney(
      cashSales +
        partyCollections +
        otherIncome -
        totalCashExpenses -
        cashStaffPayments -
        otherOutflows,
    ),
  };
};

const loadDayRecords = async (start, end) => {
  const range = { $gte: start, $lte: end };

  const [sales, invoices, payments, expenseRecords, adjustments, staffRecords, latestCount] =
    await Promise.all([
    Sale.find({
      saleType: 'retail',
      paymentMethod: 'cash',
      amount: { $gt: 0 },
      createdAt: range,
    })
      .select('billNumber amount customerName createdAt')
      .lean(),
    WholesaleInvoice.find({ paymentMethod: 'cash', paid: { $gt: 0 }, createdAt: range })
      .select('invoiceNumber partyName paid createdAt')
      .lean(),
    PartyPayment.find({ account: 'cash', paymentDate: range })
      .select('paymentNumber partyName amount paymentMethod paymentDate createdAt')
      .lean(),
    Expense.find({ account: 'cash', expenseDate: range })
      .select(
        'expenseNumber categoryKey categoryName description amount paymentMethod expenseDate createdAt',
      )
      .lean(),
    CashAdjustment.find({ adjustmentDate: range })
      .select('adjustmentNumber amount reason adjustmentDate createdAt')
      .lean(),
    StaffTransaction.find({
      account: 'cash',
      type: { $in: STAFF_PAYMENT_TYPES },
      transactionDate: range,
    })
      .select('transactionNumber staffName type amount paymentMethod transactionDate createdAt')
      .lean(),
    CashCount.findOne({ countDate: range }).sort({ countedAt: -1, _id: -1 }).lean(),
  ]);

  const retailCashSales = roundMoney(
    sales.reduce((sum, sale) => sum + (sale.amount ?? 0), 0),
  );
  const wholesaleCashSales = roundMoney(
    invoices.reduce((sum, invoice) => sum + (invoice.paid ?? 0), 0),
  );
  const cashSales = roundMoney(retailCashSales + wholesaleCashSales);
  const partyCollections = roundMoney(
    payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0),
  );

  let expensesTotal = 0;
  let staffPayments = 0;
  let loanPayments = 0;

  expenseRecords.forEach((expense) => {
    const amount = roundMoney(expense.amount ?? 0);

    if (expense.categoryKey === STAFF_CATEGORY_KEY) {
      staffPayments = roundMoney(staffPayments + amount);
      return;
    }

    if (expense.categoryKey === LOAN_CATEGORY_KEY) {
      loanPayments = roundMoney(loanPayments + amount);
      return;
    }

    expensesTotal = roundMoney(expensesTotal + amount);
  });

  let otherIncome = 0;
  let otherOutflows = 0;

  staffRecords.forEach((record) => {
    staffPayments = roundMoney(staffPayments + (record.amount ?? 0));
  });

  adjustments.forEach((adjustment) => {
    const amount = roundMoney(adjustment.amount ?? 0);

    if (amount > 0) {
      otherIncome = roundMoney(otherIncome + amount);
    } else {
      otherOutflows = roundMoney(otherOutflows + Math.abs(amount));
    }
  });

  const net = roundMoney(
    cashSales + partyCollections + otherIncome - expensesTotal - staffPayments - loanPayments - otherOutflows,
  );

  return {
    sales,
    invoices,
    payments,
    expenseRecords,
    adjustments,
    staffRecords,
    latestCount,
    cashSales,
    partyCollections,
    otherIncome,
    expenses: expensesTotal,
    staffPayments,
    loanPayments,
    otherOutflows,
    net,
  };
};

const buildEntries = (records, openingCash) => {
  const entries = [];

  records.sales.forEach((sale) => {
    entries.push({
      id: `sale-${sale._id}`,
      type: 'cash-sale',
      date: sale.createdAt,
      reference: sale.billNumber,
      description: `Cash sale · ${sale.customerName || 'Walk-in customer'}`,
      in: roundMoney(sale.amount ?? 0),
      out: 0,
      meta: { source: 'retail' },
    });
  });

  records.invoices.forEach((invoice) => {
    entries.push({
      id: `invoice-${invoice._id}`,
      type: 'cash-sale',
      date: invoice.createdAt,
      reference: invoice.invoiceNumber,
      description: `Wholesale cash receipt · ${invoice.partyName}`,
      in: roundMoney(invoice.paid ?? 0),
      out: 0,
      meta: { source: 'wholesale' },
    });
  });

  records.payments.forEach((payment) => {
    entries.push({
      id: `payment-${payment._id}`,
      type: 'collection',
      date: payment.paymentDate,
      reference: payment.paymentNumber,
      description: `Payment received · ${payment.partyName}`,
      in: roundMoney(payment.amount ?? 0),
      out: 0,
      meta: { paymentMethod: payment.paymentMethod },
    });
  });

  records.expenseRecords.forEach((expense) => {
    const type =
      expense.categoryKey === STAFF_CATEGORY_KEY
        ? 'staff'
        : expense.categoryKey === LOAN_CATEGORY_KEY
          ? 'loan'
          : 'expense';

    entries.push({
      id: `expense-${expense._id}`,
      type,
      date: expense.expenseDate,
      reference: expense.expenseNumber,
      description: `${expense.categoryName} · ${expense.description}`,
      in: 0,
      out: roundMoney(expense.amount ?? 0),
      meta: { categoryKey: expense.categoryKey, paymentMethod: expense.paymentMethod },
    });
  });

  records.staffRecords.forEach((record) => {
    entries.push({
      id: `staff-${record._id}`,
      type: 'staff',
      date: record.transactionDate,
      reference: record.transactionNumber,
      description: `${record.type === 'advance' ? 'Advance paid' : 'Salary payment'} · ${record.staffName}`,
      in: 0,
      out: roundMoney(record.amount ?? 0),
      meta: { staffName: record.staffName, paymentMethod: record.paymentMethod },
    });
  });

  records.adjustments.forEach((adjustment) => {
    const amount = roundMoney(adjustment.amount ?? 0);

    entries.push({
      id: `adjustment-${adjustment._id}`,
      type: 'adjustment',
      date: adjustment.adjustmentDate,
      reference: adjustment.adjustmentNumber,
      description: `Cash adjustment · ${adjustment.reason}`,
      in: amount > 0 ? amount : 0,
      out: amount < 0 ? Math.abs(amount) : 0,
      meta: {},
    });
  });

  const typeOrder = {
    'cash-sale': 1,
    collection: 2,
    adjustment: 3,
    expense: 4,
    staff: 5,
    loan: 6,
  };

  entries.sort((a, b) => {
    const timeDifference = new Date(a.date).getTime() - new Date(b.date).getTime();

    if (timeDifference !== 0) {
      return timeDifference;
    }

    if (a.type !== b.type) {
      return typeOrder[a.type] - typeOrder[b.type];
    }

    return String(a.id).localeCompare(String(b.id));
  });

  let runningBalance = openingCash;

  return entries.map((entry) => {
    runningBalance = roundMoney(runningBalance + entry.in - entry.out);
    return { ...entry, balance: runningBalance };
  });
};

const emptySummary = {
  openingCash: 0,
  cashSales: 0,
  partyCollections: 0,
  otherIncome: 0,
  expenses: 0,
  staffPayments: 0,
  loanPayments: 0,
  otherOutflows: 0,
  totalIn: 0,
  totalOut: 0,
  closingCash: 0,
};

export const getCashBook = async (dateInput) => {
  const dateKey = toText(dateInput) || getTodayDateKey();
  const selectedDate = parseDateOnly(dateKey, 'Cash book date');
  const todayStart = startOfLocalDay(new Date());

  if (selectedDate > todayStart) {
    throw httpError(400, 'Cash book dates after today are not available.');
  }

  const opening = await getOpeningConfig();

  if (opening.date && selectedDate < opening.date) {
    return {
      date: dateKey,
      beforeOpening: true,
      opening: {
        balance: opening.balance,
        date: opening.date,
        effective: 0,
      },
      summary: { ...emptySummary },
      closing: {
        openingCash: 0,
        cashSales: 0,
        cashCollections: 0,
        cashExpenses: 0,
        staffPayments: 0,
        otherCashTransactions: 0,
        expectedClosingCash: 0,
        physicalCash: null,
        difference: null,
        notes: '',
        reason: '',
        adjusted: false,
        countedAt: null,
        isCounted: false,
      },
      entries: [],
      latestCount: null,
    };
  }

  const start = startOfLocalDay(selectedDate);
  const end = endOfLocalDay(selectedDate);

  const [prior, day] = await Promise.all([
    getPriorCashFlow(opening.date, start),
    loadDayRecords(start, end),
  ]);

  const openingCash = roundMoney(opening.balance + prior.net);
  const totalIn = roundMoney(day.cashSales + day.partyCollections + day.otherIncome);
  const totalOut = roundMoney(
    day.expenses + day.staffPayments + day.loanPayments + day.otherOutflows,
  );
  const closingCash = roundMoney(openingCash + day.net);
  const latestCount = day.latestCount ? toCountView(day.latestCount) : null;

  return {
    date: dateKey,
    beforeOpening: false,
    opening: {
      balance: opening.balance,
      date: opening.date,
      effective: openingCash,
    },
    summary: {
      openingCash,
      cashSales: day.cashSales,
      partyCollections: day.partyCollections,
      otherIncome: day.otherIncome,
      expenses: day.expenses,
      staffPayments: day.staffPayments,
      loanPayments: day.loanPayments,
      otherOutflows: day.otherOutflows,
      totalIn,
      totalOut,
      closingCash,
    },
    closing: {
      openingCash,
      cashSales: day.cashSales,
      cashCollections: day.partyCollections,
      cashExpenses: roundMoney(day.expenses + day.loanPayments),
      staffPayments: day.staffPayments,
      otherCashTransactions: roundMoney(day.otherIncome - day.otherOutflows),
      expectedClosingCash: closingCash,
      physicalCash: latestCount ? latestCount.physicalCash : null,
      difference: latestCount ? roundMoney(latestCount.physicalCash - closingCash) : null,
      notes: latestCount?.notes ?? '',
      reason: latestCount?.reason ?? '',
      adjusted: latestCount?.adjusted ?? false,
      closingNumber: latestCount?.closingNumber ?? '',
      countedAt: latestCount?.countedAt ?? null,
      isCounted: Boolean(latestCount),
    },
    entries: buildEntries(day, openingCash),
    latestCount,
  };
};

export const getCashBookSummary = async () => {
  const book = await getCashBook();
  const start = startOfLocalDay(new Date());
  const end = endOfLocalDay(new Date());

  const expenseRows = await Expense.aggregate([
    { $match: { expenseDate: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        cash: { $sum: { $cond: [{ $eq: ['$account', 'cash'] }, '$amount', 0] } },
        bank: { $sum: { $cond: [{ $eq: ['$account', 'bank'] }, '$amount', 0] } },
        count: { $sum: 1 },
      },
    },
  ]);

  const expenseRow = expenseRows[0] ?? {};

  return {
    date: book.date,
    beforeOpening: book.beforeOpening,
    cashInHand: book.summary.closingCash,
    openingCash: book.summary.openingCash,
    cashSales: book.summary.cashSales,
    partyCollections: book.summary.partyCollections,
    closingCash: book.summary.closingCash,
    todayExpenses: {
      total: roundMoney(expenseRow.total ?? 0),
      cash: roundMoney(expenseRow.cash ?? 0),
      bank: roundMoney(expenseRow.bank ?? 0),
      count: expenseRow.count ?? 0,
    },
  };
};

export const updateOpeningCash = async (body = {}) => {
  const balance = parseNonNegativeAmount(body.openingCash, 'Opening cash');
  const date = parseDateOnly(body.openingDate, 'Opening date');

  if (date > startOfLocalDay(new Date())) {
    throw httpError(400, 'Opening date cannot be in the future.');
  }

  const settings = await BusinessSettings.findOneAndUpdate(
    {},
    { $set: { cashOpeningBalance: balance, cashOpeningDate: date } },
    {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  return {
    balance: roundMoney(settings.cashOpeningBalance ?? balance),
    date: settings.cashOpeningDate ?? date,
  };
};

export const recordCashCount = async (body = {}) => {
  const dateKey = toText(body.date) || getTodayDateKey();
  const countDate = parseDateOnly(dateKey, 'Count date');
  const todayStart = startOfLocalDay(new Date());

  if (countDate > todayStart) {
    throw httpError(400, 'Physical cash cannot be recorded for a future date.');
  }

  const book = await getCashBook(dateKey);

  if (book.beforeOpening) {
    throw httpError(400, 'Physical cash cannot be recorded before the opening date.');
  }

  const physicalCash = parseNonNegativeAmount(body.physicalCash, 'Physical cash');
  const expectedCash = book.summary.closingCash;
  const difference = roundMoney(physicalCash - expectedCash);
  const adjustCashBook = parseBoolean(body.adjustCashBook ?? body.adjustment, false);
  const reason = parseReason(body.reason);
  const notes = parseNotes(body.notes);
  const shouldAdjust = adjustCashBook && Math.abs(difference) >= 0.005;

  if (shouldAdjust && !reason) {
    throw httpError(400, 'A reason is required when adjusting the cash book.');
  }

  let adjustment = null;

  if (shouldAdjust) {
    const adjustmentNumber = await getNextCashAdjustmentNumber();
    const adjustmentDate =
      dateKey === getTodayDateKey() ? new Date() : endOfLocalDay(countDate);

    adjustment = await CashAdjustment.create({
      adjustmentNumber,
      adjustmentDate,
      amount: difference,
      reason,
      notes,
    });
  }

  let count;

  try {
    const closingNumber = await getNextCashClosingNumber();

    count = await CashCount.create({
      closingNumber,
      countDate,
      expectedCash,
      physicalCash,
      difference,
      adjusted: Boolean(adjustment),
      adjustment: adjustment?._id ?? null,
      reason,
      notes,
      countedAt: new Date(),
    });
  } catch (error) {
    if (adjustment) {
      await CashAdjustment.deleteOne({ _id: adjustment._id });
    }

    throw error;
  }

  return {
    count: toCountView(count),
    cashBook: await getCashBook(dateKey),
  };
};
