import mongoose from 'mongoose';

import { BankAccount } from '../models/BankAccount.js';
import { BankTransaction } from '../models/BankTransaction.js';
import { BusinessSettings } from '../models/BusinessSettings.js';
import { CashAdjustment } from '../models/CashAdjustment.js';
import { Expense } from '../models/Expense.js';
import { Party } from '../models/Party.js';
import { PartyPayment } from '../models/PartyPayment.js';
import { Product } from '../models/Product.js';
import { Production } from '../models/Production.js';
import { Sale } from '../models/Sale.js';
import { Staff } from '../models/Staff.js';
import { STAFF_PAYMENT_TYPES, StaffTransaction } from '../models/StaffTransaction.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { WholesaleInvoice } from '../models/WholesaleInvoice.js';
import {
  addLocalDays,
  endOfLocalDay,
  parseDateOnly,
  startOfLocalDay,
  toLocalDateKey,
} from '../utils/dates.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegExp, toText } from '../utils/validators.js';

const MAX_RANGE_DAYS = 366;
const MAX_ROWS = 2000;
const STAFF_CATEGORY_KEY = 'salary';
const LOAN_CATEGORY_KEY = 'loan interest';
const DEFAULT_LOW_STOCK_THRESHOLD = 100;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const METHOD_LABELS = { cash: 'Cash', upi: 'UPI', bank: 'Bank', credit: 'Credit' };
const BANK_TYPE_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  'sales-collection': 'Sales collection',
  'party-payment': 'Party payment',
  expense: 'Expense',
  'loan-receipt': 'Loan receipt',
  'loan-repayment': 'Loan repayment',
  'staff-payment': 'Staff payment',
  transfer: 'Transfer',
  other: 'Other',
};
const ACCOUNT_LABELS = { cash: 'Cash', bank: 'Bank' };

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);
const roundQuantity = (value) => roundTo(value, 6);

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const rangeLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const monthLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
});

const dayKeyExpression = (field) => ({
  $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: timeZone },
});

const buildSearch = (term, fields) => {
  const text = toText(term);

  if (!text) {
    return null;
  }

  const pattern = new RegExp(escapeRegExp(text), 'i');
  return { $or: fields.map((field) => ({ [field]: pattern })) };
};

const maskAccountNumber = (value) => {
  const text = String(value ?? '');

  if (text.length <= 4) {
    return '•'.repeat(Math.max(text.length, 4));
  }

  return `•••• ${text.slice(-4)}`;
};

const monthStartDate = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

const parseDateRange = (query = {}, { defaultFrom = monthStartDate(), defaultTo = null } = {}) => {
  const today = startOfLocalDay(new Date());
  const todayEnd = endOfLocalDay(today);
  const fromKey = toText(query.from);
  const toKey = toText(query.to);
  let from;
  let to;

  if (!fromKey && !toKey) {
    from = defaultFrom;
    to = defaultTo ?? todayEnd;
  } else {
    if (!fromKey || !toKey) {
      throw httpError(400, 'Both from and to dates are required.');
    }

    from = parseDateOnly(fromKey, 'From date');
    const endDate = parseDateOnly(toKey, 'To date');

    if (startOfLocalDay(endDate) > today) {
      throw httpError(400, 'Report dates after today are not available.');
    }

    if (from > endDate) {
      throw httpError(400, 'From date cannot be after the to date.');
    }

    to = endOfLocalDay(endDate);
  }

  const days =
    Math.round(
      (startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / 86400000,
    ) + 1;

  if (days > MAX_RANGE_DAYS) {
    throw httpError(400, `Report ranges cannot be longer than ${MAX_RANGE_DAYS} days.`);
  }

  const fromDateKey = toLocalDateKey(from);
  const toDateKey = toLocalDateKey(to);

  return {
    from,
    to,
    fromKey: fromDateKey,
    toKey: toDateKey,
    days,
    label:
      fromDateKey === toDateKey
        ? rangeLabelFormatter.format(from)
        : `${rangeLabelFormatter.format(from)} – ${rangeLabelFormatter.format(to)}`,
  };
};

const parseSingleDate = (value, label = 'Date') => {
  const text = toText(value);
  const date = text
    ? parseDateOnly(text, label)
    : startOfLocalDay(new Date());

  if (date > startOfLocalDay(new Date())) {
    throw httpError(400, `${label} cannot be in the future.`);
  }

  return date;
};

const parseMonth = (value) => {
  const text = toText(value);

  if (!text) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { key, start, end: endOfLocalDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  }

  if (!MONTH_PATTERN.test(text)) {
    throw httpError(400, 'Month must use the YYYY-MM format.');
  }

  const [year, month] = text.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const now = new Date();

  if (startOfLocalDay(start) > startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1))) {
    throw httpError(400, 'Report months after the current month are not available.');
  }

  return {
    key: text,
    start,
    end: endOfLocalDay(new Date(year, month, 0)),
  };
};

const salesRows = async (from, to, search) => {
  const range = { $gte: from, $lte: to };
  const saleSearch = buildSearch(search, ['billNumber', 'customerName', 'productName']);
  const invoiceSearch = buildSearch(search, ['invoiceNumber', 'partyName', 'productName']);

  const [sales, invoices] = await Promise.all([
    Sale.find({ saleType: 'retail', createdAt: range, ...(saleSearch ?? {}) })
      .select('billNumber customerName productName quantity unit amount paymentMethod createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_ROWS)
      .lean(),
    WholesaleInvoice.find({ createdAt: range, ...(invoiceSearch ?? {}) })
      .select(
        'invoiceNumber partyName productName quantity unit total paid due paymentMethod createdAt',
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_ROWS)
      .lean(),
  ]);

  const rows = [
    ...sales.map((sale) => {
      const paid = sale.paymentMethod === 'credit' ? 0 : roundMoney(sale.amount);

      return {
        date: sale.createdAt,
        type: 'Retail',
        reference: sale.billNumber,
        name: sale.customerName || 'Walk-in customer',
        product: sale.productName,
        quantity: roundQuantity(sale.quantity),
        unit: sale.unit,
        amount: roundMoney(sale.amount),
        paid,
        due: roundMoney(sale.amount - paid),
        method: METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod,
      };
    }),
    ...invoices.map((invoice) => ({
      date: invoice.createdAt,
      type: 'Wholesale',
      reference: invoice.invoiceNumber,
      name: invoice.partyName,
      product: invoice.productName,
      quantity: roundQuantity(invoice.quantity),
      unit: invoice.unit,
      amount: roundMoney(invoice.total),
      paid: roundMoney(invoice.paid),
      due: roundMoney(invoice.due),
      method: METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const summary = rows.reduce(
    (accumulator, row) => ({
      retail: roundMoney(accumulator.retail + (row.type === 'Retail' ? row.amount : 0)),
      wholesale: roundMoney(accumulator.wholesale + (row.type === 'Wholesale' ? row.amount : 0)),
      total: roundMoney(accumulator.total + row.amount),
      paid: roundMoney(accumulator.paid + row.paid),
      due: roundMoney(accumulator.due + row.due),
      retailCount: accumulator.retailCount + (row.type === 'Retail' ? 1 : 0),
      wholesaleCount: accumulator.wholesaleCount + (row.type === 'Wholesale' ? 1 : 0),
      count: accumulator.count + 1,
    }),
    {
      retail: 0,
      wholesale: 0,
      total: 0,
      paid: 0,
      due: 0,
      retailCount: 0,
      wholesaleCount: 0,
      count: 0,
    },
  );

  return { rows, summary };
};

const dailySalesReport = async (query) => {
  const date = parseSingleDate(query.date, 'Sales date');
  const range = parseDateRange({ from: toLocalDateKey(date), to: toLocalDateKey(date) });
  const { rows, summary } = await salesRows(range.from, range.to, query.search);

  return {
    key: 'daily-sales',
    title: 'Daily Sales Report',
    description: 'Retail bills and wholesale invoices recorded on the selected day.',
    range,
    filters: { search: toText(query.search) },
    summary,
    rows,
    notes: ['Sales are billed amounts. Credit invoices appear in sales but are not cash received.'],
  };
};

const monthlySalesReport = async (query) => {
  const month = parseMonth(query.month);
  const todayEnd = endOfLocalDay(new Date());
  const end = month.end > todayEnd ? todayEnd : month.end;
  const range = parseDateRange({
    from: toLocalDateKey(month.start),
    to: toLocalDateKey(end),
  });
  const previousStart = new Date(month.start.getFullYear(), month.start.getMonth() - 1, 1);
  const previousEnd = endOfLocalDay(new Date(month.start.getFullYear(), month.start.getMonth(), 0));

  const [retailRows, invoiceRows, previousSales] = await Promise.all([
    Sale.aggregate([
      { $match: { saleType: 'retail', createdAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: dayKeyExpression('createdAt'),
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    WholesaleInvoice.aggregate([
      { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: dayKeyExpression('createdAt'),
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]),
    (async () => {
      const [retailRow, invoiceRow] = await Promise.all([
        Sale.aggregate([
          {
            $match: {
              saleType: 'retail',
              createdAt: { $gte: previousStart, $lte: previousEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        WholesaleInvoice.aggregate([
          { $match: { createdAt: { $gte: previousStart, $lte: previousEnd } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
      ]);

      return roundMoney((retailRow[0]?.total ?? 0) + (invoiceRow[0]?.total ?? 0));
    })(),
  ]);

  const retailByDay = new Map(
    retailRows.map((row) => [row._id, { total: roundMoney(row.total ?? 0), count: row.count ?? 0 }]),
  );
  const wholesaleByDay = new Map(
    invoiceRows.map((row) => [row._id, { total: roundMoney(row.total ?? 0), count: row.count ?? 0 }]),
  );
  const dayKeys = [...new Set([...retailByDay.keys(), ...wholesaleByDay.keys()])].sort();

  const rows = dayKeys.map((key) => {
    const retailRow = retailByDay.get(key) ?? { total: 0, count: 0 };
    const wholesaleRow = wholesaleByDay.get(key) ?? { total: 0, count: 0 };

    return {
      date: key,
      retail: retailRow.total,
      wholesale: wholesaleRow.total,
      total: roundMoney(retailRow.total + wholesaleRow.total),
      retailCount: retailRow.count,
      wholesaleCount: wholesaleRow.count,
      count: retailRow.count + wholesaleRow.count,
    };
  });

  const summary = rows.reduce(
    (accumulator, row) => ({
      retail: roundMoney(accumulator.retail + row.retail),
      wholesale: roundMoney(accumulator.wholesale + row.wholesale),
      total: roundMoney(accumulator.total + row.total),
      count: accumulator.count + row.count,
    }),
    { retail: 0, wholesale: 0, total: 0, count: 0 },
  );

  summary.previousMonth = previousSales;
  summary.change = roundMoney(summary.total - previousSales);
  summary.changePercent =
    previousSales > 0 ? roundTo((summary.change / previousSales) * 100, 1) : null;

  return {
    key: 'monthly-sales',
    title: 'Monthly Sales Report',
    description: 'Day-by-day retail and wholesale sales for the selected month.',
    range,
    filters: { month: month.key, monthLabel: monthLabelFormatter.format(month.start) },
    summary,
    rows,
    notes: [
      `Previous month (${monthLabelFormatter.format(previousStart)}) total: ${previousSales}.`,
      'Sales are billed amounts. Credit invoices appear in sales but are not cash received.',
    ],
  };
};

const salesRangeReport = async (query) => {
  const range = parseDateRange(query);
  const { rows, summary } = await salesRows(range.from, range.to, query.search);

  return {
    key: 'sales-range',
    title: 'Date Range Sales Report',
    description: 'Retail bills and wholesale invoices across the selected dates.',
    range,
    filters: { search: toText(query.search) },
    summary,
    rows,
    notes: ['Sales are billed amounts. Credit invoices appear in sales but are not cash received.'],
  };
};

const expenseReport = async (query) => {
  const range = parseDateRange(query);
  const search = buildSearch(query.search, [
    'expenseNumber',
    'description',
    'categoryName',
    'notes',
  ]);
  const categoryKey = toText(query.category).toLowerCase();
  const filters = {
    expenseDate: { $gte: range.from, $lte: range.to },
    ...(categoryKey ? { categoryKey } : {}),
    ...(search ?? {}),
  };

  const [expenses, summaryRows, categoryRows] = await Promise.all([
    Expense.find(filters)
      .select(
        'expenseNumber categoryKey categoryName description amount paymentMethod account expenseDate',
      )
      .sort({ expenseDate: -1, _id: -1 })
      .limit(MAX_ROWS)
      .lean(),
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
    Expense.aggregate([
      { $match: filters },
      {
        $group: {
          _id: { key: '$categoryKey', name: '$categoryName' },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1, '_id.name': 1 } },
      { $limit: 10 },
    ]),
  ]);

  const summaryRow = summaryRows[0] ?? {};

  return {
    key: 'expenses',
    title: 'Expense Report',
    description: 'Expenses recorded in the selected period, with cash and bank split.',
    range,
    filters: {
      search: toText(query.search),
      category: categoryKey,
    },
    summary: {
      total: roundMoney(summaryRow.total ?? 0),
      cash: roundMoney(summaryRow.cash ?? 0),
      bank: roundMoney(summaryRow.bank ?? 0),
      count: summaryRow.count ?? 0,
    },
    rows: expenses.map((expense) => ({
      date: expense.expenseDate,
      reference: expense.expenseNumber,
      category: expense.categoryName,
      description: expense.description,
      method: METHOD_LABELS[expense.paymentMethod] ?? expense.paymentMethod,
      account: ACCOUNT_LABELS[expense.account] ?? expense.account,
      amount: roundMoney(expense.amount),
    })),
    extra: {
      categories: categoryRows.map((row) => ({
        key: row._id?.key ?? '',
        name: row._id?.name ?? 'Uncategorised',
        amount: roundMoney(row.amount ?? 0),
        count: row.count ?? 0,
      })),
    },
    notes: ['Expenses are costs. They are never counted as sales.'],
  };
};

const emptyDailyFlow = () => ({
  cashSales: 0,
  collections: 0,
  otherIncome: 0,
  otherExpenses: 0,
  staffPayments: 0,
  loanPayments: 0,
  otherOutflows: 0,
});

const dailyCashFlows = async (from, to) => {
  const range = { $gte: from, $lte: to };

  const [retailRows, invoiceRows, paymentRows, expenseRows, staffRows, adjustmentRows] =
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
        {
          $group: {
            _id: dayKeyExpression('createdAt'),
            total: { $sum: '$amount' },
          },
        },
      ]),
      WholesaleInvoice.aggregate([
        { $match: { paymentMethod: 'cash', paid: { $gt: 0 }, createdAt: range } },
        {
          $group: {
            _id: dayKeyExpression('createdAt'),
            total: { $sum: '$paid' },
          },
        },
      ]),
      PartyPayment.aggregate([
        { $match: { account: 'cash', paymentDate: range } },
        {
          $group: {
            _id: dayKeyExpression('paymentDate'),
            total: { $sum: '$amount' },
          },
        },
      ]),
      Expense.aggregate([
        { $match: { account: 'cash', expenseDate: range } },
        {
          $group: {
            _id: dayKeyExpression('expenseDate'),
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
      StaffTransaction.aggregate([
        {
          $match: {
            account: 'cash',
            type: { $in: STAFF_PAYMENT_TYPES },
            transactionDate: range,
          },
        },
        {
          $group: {
            _id: dayKeyExpression('transactionDate'),
            total: { $sum: '$amount' },
          },
        },
      ]),
      CashAdjustment.aggregate([
        { $match: { adjustmentDate: range } },
        {
          $group: {
            _id: dayKeyExpression('adjustmentDate'),
            income: {
              $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] },
            },
            outflow: {
              $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] },
            },
          },
        },
      ]),
    ]);

  const flows = new Map();

  const ensure = (key) => {
    if (!flows.has(key)) {
      flows.set(key, emptyDailyFlow());
    }

    return flows.get(key);
  };

  retailRows.forEach((row) => {
    ensure(row._id).cashSales += row.total ?? 0;
  });
  invoiceRows.forEach((row) => {
    ensure(row._id).cashSales += row.total ?? 0;
  });
  paymentRows.forEach((row) => {
    ensure(row._id).collections += row.total ?? 0;
  });
  expenseRows.forEach((row) => {
    const flow = ensure(row._id);
    flow.otherExpenses += (row.total ?? 0) - (row.staff ?? 0) - (row.loan ?? 0);
    flow.staffPayments += row.staff ?? 0;
    flow.loanPayments += row.loan ?? 0;
  });
  staffRows.forEach((row) => {
    ensure(row._id).staffPayments += row.total ?? 0;
  });
  adjustmentRows.forEach((row) => {
    const flow = ensure(row._id);
    flow.otherIncome += row.income ?? 0;
    flow.otherOutflows += row.outflow ?? 0;
  });

  const result = new Map();

  flows.forEach((flow, key) => {
    const inflow = roundMoney(flow.cashSales + flow.collections + flow.otherIncome);
    const outflow = roundMoney(
      flow.otherExpenses +
        flow.staffPayments +
        flow.loanPayments +
        flow.otherOutflows,
    );

    result.set(key, {
      cashSales: roundMoney(flow.cashSales),
      collections: roundMoney(flow.collections),
      otherIncome: roundMoney(flow.otherIncome),
      expenses: roundMoney(flow.otherExpenses),
      staffPayments: roundMoney(flow.staffPayments),
      loanPayments: roundMoney(flow.loanPayments),
      otherOutflows: roundMoney(flow.otherOutflows),
      inflow,
      outflow,
      net: roundMoney(inflow - outflow),
    });
  });

  return result;
};

const sumFlows = (flows) => {
  let inflow = 0;
  let outflow = 0;

  flows.forEach((flow) => {
    inflow += flow.inflow;
    outflow += flow.outflow;
  });

  return { inflow: roundMoney(inflow), outflow: roundMoney(outflow), net: roundMoney(inflow - outflow) };
};

const cashBookReport = async (query) => {
  const range = parseDateRange(query);
  const settings = await BusinessSettings.findOne().lean();
  const openingBalance = roundMoney(settings?.cashOpeningBalance ?? 0);
  const openingDate = settings?.cashOpeningDate
    ? startOfLocalDay(settings.cashOpeningDate)
    : null;

  let effectiveFrom = range.from;

  if (openingDate && openingDate > effectiveFrom) {
    effectiveFrom = openingDate;
  }

  if (effectiveFrom > range.to) {
    return {
      key: 'cash-book',
      title: 'Cash Book Report',
      description: 'Daily opening cash, cash in, cash out and closing cash.',
      range,
      filters: {},
      summary: {
        opening: openingBalance,
        inflow: 0,
        outflow: 0,
        net: 0,
        closing: openingBalance,
      },
      rows: [],
      notes: ['The selected range is before the opening cash date.'],
    };
  }

  const priorFrom = openingDate ?? effectiveFrom;
  const priorTo = endOfLocalDay(addLocalDays(startOfLocalDay(effectiveFrom), -1));
  const priorNet =
    priorTo >= priorFrom
      ? sumFlows(await dailyCashFlows(priorFrom, priorTo)).net
      : 0;
  const dayFlows = await dailyCashFlows(effectiveFrom, range.to);

  let running = roundMoney(openingBalance + priorNet);
  const opening = running;
  const rows = [];
  let totalIn = 0;
  let totalOut = 0;
  const cursor = startOfLocalDay(effectiveFrom);

  while (cursor <= range.to) {
    const key = toLocalDateKey(cursor);
    const flow = dayFlows.get(key) ?? {
      cashSales: 0,
      collections: 0,
      otherIncome: 0,
      expenses: 0,
      staffPayments: 0,
      loanPayments: 0,
      otherOutflows: 0,
      inflow: 0,
      outflow: 0,
      net: 0,
    };
    const closing = roundMoney(running + flow.net);

    rows.push({
      date: key,
      opening: running,
      cashSales: flow.cashSales,
      collections: flow.collections,
      otherIncome: flow.otherIncome,
      expenses: flow.expenses,
      staffPayments: flow.staffPayments,
      loanPayments: flow.loanPayments,
      otherOutflows: flow.otherOutflows,
      inflow: flow.inflow,
      outflow: flow.outflow,
      net: flow.net,
      closing,
    });

    totalIn = roundMoney(totalIn + flow.inflow);
    totalOut = roundMoney(totalOut + flow.outflow);
    running = closing;
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    key: 'cash-book',
    title: 'Cash Book Report',
    description: 'Daily opening cash, cash in, cash out and closing cash.',
    range,
    filters: {},
    summary: {
      opening,
      inflow: totalIn,
      outflow: totalOut,
      net: roundMoney(totalIn - totalOut),
      closing: running,
    },
    rows,
    notes: [
      'Credit sales and unpaid invoice dues never enter the cash book.',
      'Cash staff payments and physical cash adjustments are included.',
    ],
  };
};

const bankReport = async (query) => {
  const range = parseDateRange(query);
  const accountId = toText(query.account);

  if (accountId && !mongoose.isValidObjectId(accountId)) {
    throw httpError(400, 'Select a valid bank account.');
  }

  const search = buildSearch(query.search, ['description', 'reference', 'transactionNumber']);
  const filters = {
    transactionDate: { $gte: range.from, $lte: range.to },
    ...(accountId ? { bankAccount: accountId } : {}),
    ...(search ?? {}),
  };

  const [transactions, summaryRows, accounts] = await Promise.all([
    BankTransaction.find(filters)
      .select(
        'transactionNumber bankAccount type direction amount transactionDate description reference',
      )
      .sort({ transactionDate: -1, _id: -1 })
      .limit(MAX_ROWS)
      .lean(),
    BankTransaction.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          inflow: {
            $sum: { $cond: [{ $eq: ['$direction', 'inflow'] }, '$amount', 0] },
          },
          outflow: {
            $sum: { $cond: [{ $eq: ['$direction', 'outflow'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    BankAccount.find().lean(),
  ]);

  const accountsById = new Map(accounts.map((account) => [String(account._id), account]));
  const summaryRow = summaryRows[0] ?? {};
  const selectedAccount = accountId ? accountsById.get(accountId) : null;

  return {
    key: 'bank',
    title: 'Bank Report',
    description: 'Bank account transactions with money in, money out and net movement.',
    range,
    filters: {
      search: toText(query.search),
      account: accountId
        ? `${selectedAccount?.bankName ?? 'Account'} · ${maskAccountNumber(
            selectedAccount?.accountNumber,
          )}`
        : 'All accounts',
    },
    summary: {
      inflow: roundMoney(summaryRow.inflow ?? 0),
      outflow: roundMoney(summaryRow.outflow ?? 0),
      net: roundMoney((summaryRow.inflow ?? 0) - (summaryRow.outflow ?? 0)),
      count: summaryRow.count ?? 0,
    },
    rows: transactions.map((transaction) => {
      const account = accountsById.get(String(transaction.bankAccount));

      return {
        date: transaction.transactionDate,
        account: account
          ? `${account.bankName} · ${maskAccountNumber(account.accountNumber)}`
          : 'Bank account',
        reference: transaction.transactionNumber,
        type: BANK_TYPE_LABELS[transaction.type] ?? transaction.type,
        description: transaction.description,
        inflow: transaction.direction === 'inflow' ? roundMoney(transaction.amount) : 0,
        outflow: transaction.direction === 'outflow' ? roundMoney(transaction.amount) : 0,
      };
    }),
    notes: [
      'Transfers between accounts appear as a paired inflow and outflow and do not change the total bank balance.',
      'Cash movements are reported in the cash book, not here.',
    ],
  };
};

const partyOutstandingReport = async (query) => {
  const asOf = parseSingleDate(query.asOf, 'As-of date');
  const asOfEnd = endOfLocalDay(asOf);
  const search = buildSearch(query.search, ['name', 'phone']);

  const rows = await Party.aggregate([
    {
      $lookup: {
        from: 'wholesaleinvoices',
        let: { partyId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$party', '$$partyId'] },
              createdAt: { $lte: asOfEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paid' } } },
        ],
        as: 'invoices',
      },
    },
    {
      $lookup: {
        from: 'partypayments',
        let: { partyId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$party', '$$partyId'] },
              paymentDate: { $lte: asOfEnd },
            },
          },
          { $group: { _id: null, amount: { $sum: '$amount' } } },
        ],
        as: 'payments',
      },
    },
    {
      $addFields: {
        opening: { $ifNull: ['$openingBalance', 0] },
        invoiced: { $sum: '$invoices.total' },
        invoicePaid: { $sum: '$invoices.paid' },
        received: { $sum: '$payments.amount' },
      },
    },
    {
      $addFields: {
        outstanding: {
          $round: [
            {
              $subtract: [
                { $add: ['$opening', '$invoiced'] },
                { $add: ['$invoicePaid', '$received'] },
              ],
            },
            2,
          ],
        },
      },
    },
    { $match: { outstanding: { $gt: 0.005 }, ...(search ?? {}) } },
    { $sort: { outstanding: -1, name: 1 } },
    {
      $project: {
        name: 1,
        phone: 1,
        opening: 1,
        invoiced: 1,
        invoicePaid: 1,
        received: 1,
        outstanding: 1,
        creditLimit: 1,
      },
    },
  ]);

  const mapped = rows.map((row) => ({
    partyId: String(row._id),
    name: row.name,
    phone: row.phone,
    opening: roundMoney(row.opening ?? 0),
    invoiced: roundMoney(row.invoiced ?? 0),
    received: roundMoney((row.invoicePaid ?? 0) + (row.received ?? 0)),
    outstanding: roundMoney(row.outstanding ?? 0),
    creditLimit: roundMoney(row.creditLimit ?? 0),
  }));

  return {
    key: 'party-outstanding',
    title: 'Party Outstanding Report',
    description: 'Parties with an outstanding balance as of the selected date.',
    range: {
      fromKey: toLocalDateKey(asOf),
      toKey: toLocalDateKey(asOf),
      label: `As of ${rangeLabelFormatter.format(asOf)}`,
      days: 1,
    },
    filters: { search: toText(query.search), asOf: toLocalDateKey(asOf) },
    summary: {
      totalOutstanding: roundMoney(
        mapped.reduce((sum, row) => sum + row.outstanding, 0),
      ),
      partyCount: mapped.length,
      totalInvoiced: roundMoney(mapped.reduce((sum, row) => sum + row.invoiced, 0)),
      totalReceived: roundMoney(mapped.reduce((sum, row) => sum + row.received, 0)),
    },
    rows: mapped,
    notes: ['Outstanding = opening balance + invoices − invoice receipts − party payments.'],
  };
};

const partyLedgerReport = async (query) => {
  const partyId = toText(query.party);

  if (!partyId || !mongoose.isValidObjectId(partyId)) {
    throw httpError(400, 'Select a party to generate the ledger.');
  }

  const party = await Party.findById(partyId).lean();

  if (!party) {
    throw httpError(404, 'Party not found.');
  }

  const range = parseDateRange(query);

  const [invoiceBeforeRows, paymentBeforeRows, invoices, payments] = await Promise.all([
    WholesaleInvoice.aggregate([
      { $match: { party: party._id, createdAt: { $lt: range.from } } },
      { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paid' } } },
    ]),
    PartyPayment.aggregate([
      { $match: { party: party._id, paymentDate: { $lt: range.from } } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    WholesaleInvoice.find({
      party: party._id,
      createdAt: { $gte: range.from, $lte: range.to },
    })
      .select('invoiceNumber productName total paid due status createdAt')
      .lean(),
    PartyPayment.find({
      party: party._id,
      paymentDate: { $gte: range.from, $lte: range.to },
    })
      .select('paymentNumber amount paymentMethod account paymentDate')
      .lean(),
  ]);

  const invoiceBefore = invoiceBeforeRows[0] ?? {};
  const paymentBefore = paymentBeforeRows[0] ?? {};
  const opening = roundMoney(
    (party.openingBalance ?? 0) +
      (invoiceBefore.total ?? 0) -
      (invoiceBefore.paid ?? 0) -
      (paymentBefore.amount ?? 0),
  );

  const entries = [
    ...invoices.map((invoice) => ({
      date: invoice.createdAt,
      type: 'Invoice',
      reference: invoice.invoiceNumber,
      description: `Wholesale invoice · ${invoice.productName}`,
      debit: roundMoney(invoice.total),
      credit: roundMoney(invoice.paid),
      balanceBase: 0,
    })),
    ...payments.map((payment) => ({
      date: payment.paymentDate,
      type: 'Payment',
      reference: payment.paymentNumber,
      description: `Payment received · ${METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}`,
      debit: 0,
      credit: roundMoney(payment.amount),
      balanceBase: 0,
    })),
  ].sort((a, b) => {
    const difference = new Date(a.date).getTime() - new Date(b.date).getTime();

    if (difference !== 0) {
      return difference;
    }

    if (a.type !== b.type) {
      return a.type === 'Invoice' ? -1 : 1;
    }

    return String(a.reference).localeCompare(String(b.reference));
  });

  let running = opening;
  const rows = entries.map((entry) => {
    running = roundMoney(running + entry.debit - entry.credit);

    return {
      date: entry.date,
      type: entry.type,
      reference: entry.reference,
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit,
      balance: running,
    };
  });

  const totalDebit = roundMoney(rows.reduce((sum, row) => sum + row.debit, 0));
  const totalCredit = roundMoney(rows.reduce((sum, row) => sum + row.credit, 0));

  return {
    key: 'party-ledger',
    title: 'Party Ledger Report',
    description: 'Date, description, debit, credit and running balance for one party.',
    range,
    filters: { party: party.name, search: '' },
    summary: {
      opening,
      totalDebit,
      totalCredit,
      closing: roundMoney(opening + totalDebit - totalCredit),
      invoiceCount: invoices.length,
      paymentCount: payments.length,
    },
    rows,
    notes: [
      'Invoices are debits; invoice receipts and later payments are credits. The closing balance is the party outstanding.',
    ],
  };
};

const stockReport = async (query) => {
  const range = parseDateRange(query);
  const search = buildSearch(query.search, ['name']);
  const products = await Product.find(search ?? {})
    .select('name unit active')
    .sort({ active: -1, name: 1 })
    .lean();
  const settings = await BusinessSettings.findOne().lean();
  const threshold = Number(settings?.lowStockThresholdKg);
  const lowStockThreshold =
    Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_LOW_STOCK_THRESHOLD;

  const productIds = products.map((product) => product._id);
  const rows = await stockRangeByProduct(productIds, range);

  const mapped = products.map((product) => {
    const row = rows.get(String(product._id)) ?? { before: 0, inflow: 0, outflow: 0 };
    const opening = roundQuantity(row.before);
    const inflow = roundQuantity(row.inflow);
    const outflow = roundQuantity(row.outflow);
    const closing = roundQuantity(opening + inflow - outflow);

    return {
      productId: String(product._id),
      product: product.name,
      unit: product.unit,
      active: product.active !== false,
      opening,
      inflow,
      outflow,
      closing,
      lowStock: closing < lowStockThreshold,
    };
  });

  return {
    key: 'stock',
    title: 'Stock Report',
    description: 'Opening stock, stock in, stock out and closing stock for the selected period.',
    range,
    filters: { search: toText(query.search) },
    summary: {
      productCount: mapped.length,
      opening: roundQuantity(mapped.reduce((sum, row) => sum + row.opening, 0)),
      inflow: roundQuantity(mapped.reduce((sum, row) => sum + row.inflow, 0)),
      outflow: roundQuantity(mapped.reduce((sum, row) => sum + row.outflow, 0)),
      closing: roundQuantity(mapped.reduce((sum, row) => sum + row.closing, 0)),
      lowStockCount: mapped.filter((row) => row.lowStock).length,
      lowStockThreshold: roundQuantity(lowStockThreshold),
    },
    rows: mapped,
    notes: [
      'Opening stock is the balance at the start of the range; closing stock is the balance at the end.',
      'Low-stock warning uses the threshold from business settings.',
    ],
  };
};

const stockRangeByProduct = async (productIds, range) => {
  if (productIds.length === 0) {
    return new Map();
  }

  const rows = await StockTransaction.aggregate([
    { $match: { product: { $in: productIds } } },
    {
      $group: {
        _id: '$product',
        before: {
          $sum: { $cond: [{ $lt: ['$date', range.from] }, '$quantity', 0] },
        },
        inflow: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$date', range.from] },
                  { $lte: ['$date', range.to] },
                  { $gt: ['$quantity', 0] },
                ],
              },
              '$quantity',
              0,
            ],
          },
        },
        outflow: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$date', range.from] },
                  { $lte: ['$date', range.to] },
                  { $lt: ['$quantity', 0] },
                ],
              },
              { $abs: '$quantity' },
              0,
            ],
          },
        },
      },
    },
  ]);

  return new Map(rows.map((row) => [String(row._id), row]));
};

const productionReport = async (query) => {
  const range = parseDateRange(query);
  const search = buildSearch(query.search, ['productionNumber', 'productName', 'notes']);

  const [productions, summaryRows] = await Promise.all([
    Production.find({
      productionDate: { $gte: range.from, $lte: range.to },
      ...(search ?? {}),
    })
      .select(
        'productionNumber productName unit productionDate rawMaterialKg finishedKg wastageKg productionCost notes',
      )
      .sort({ productionDate: -1, _id: -1 })
      .limit(MAX_ROWS)
      .lean(),
    Production.aggregate([
      { $match: { productionDate: { $gte: range.from, $lte: range.to }, ...(search ?? {}) } },
      {
        $group: {
          _id: null,
          finishedKg: { $sum: '$finishedKg' },
          rawMaterialKg: { $sum: '$rawMaterialKg' },
          wastageKg: { $sum: '$wastageKg' },
          productionCost: { $sum: '$productionCost' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const summaryRow = summaryRows[0] ?? {};
  const finishedKg = roundQuantity(summaryRow.finishedKg ?? 0);
  const rawMaterialKg = roundQuantity(summaryRow.rawMaterialKg ?? 0);

  return {
    key: 'production',
    title: 'Production Report',
    description: 'Production batches, finished Muri and yield for the selected period.',
    range,
    filters: { search: toText(query.search) },
    summary: {
      batches: summaryRow.count ?? 0,
      finishedKg,
      rawMaterialKg,
      wastageKg: roundQuantity(summaryRow.wastageKg ?? 0),
      productionCost: roundMoney(summaryRow.productionCost ?? 0),
      averageYield: rawMaterialKg > 0 ? roundTo((finishedKg / rawMaterialKg) * 100, 2) : null,
    },
    rows: productions.map((production) => ({
      date: production.productionDate,
      reference: production.productionNumber,
      product: production.productName,
      rawMaterialKg: roundQuantity(production.rawMaterialKg),
      finishedKg: roundQuantity(production.finishedKg),
      wastageKg: roundQuantity(production.wastageKg),
      cost: roundMoney(production.productionCost),
      yieldPercent:
        Number(production.rawMaterialKg) > 0
          ? roundTo((Number(production.finishedKg) / Number(production.rawMaterialKg)) * 100, 2)
          : null,
    })),
    notes: [
      'Yield = finished Muri ÷ raw material × 100. Raw material is kept on the production record only.',
    ],
  };
};

const staffReport = async (query) => {
  const range = parseDateRange(query);
  const search = buildSearch(query.search, ['name', 'role', 'phone']);
  const rangeMatch = { transactionDate: { $gte: range.from, $lte: range.to } };

  const columns = {
    salary: { $sum: { $cond: [{ $eq: ['$type', 'salary'] }, '$amount', 0] } },
    bonus: { $sum: { $cond: [{ $eq: ['$type', 'bonus'] }, '$amount', 0] } },
    advance: { $sum: { $cond: [{ $eq: ['$type', 'advance'] }, '$amount', 0] } },
    payment: { $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] } },
    deduction: { $sum: { $cond: [{ $eq: ['$type', 'deduction'] }, '$amount', 0] } },
    recovery: { $sum: { $cond: [{ $eq: ['$type', 'recovery'] }, '$amount', 0] } },
    count: { $sum: 1 },
  };

  const [staff, rangeRows, allRows] = await Promise.all([
    Staff.find(search ?? {}).sort({ name: 1, _id: 1 }).lean(),
    StaffTransaction.aggregate([
      { $match: rangeMatch },
      { $group: { _id: '$staff', ...columns } },
    ]),
    StaffTransaction.aggregate([{ $group: { _id: '$staff', ...columns } }]),
  ]);

  const rangeByStaff = new Map(rangeRows.map((row) => [String(row._id), row]));
  const allByStaff = new Map(allRows.map((row) => [String(row._id), row]));

  const rows = staff.map((member) => {
    const rangeRow = rangeByStaff.get(String(member._id)) ?? {};
    const allRow = allByStaff.get(String(member._id)) ?? {};
    const salaryPayable = roundMoney((allRow.salary ?? 0) + (allRow.bonus ?? 0));
    const paidAndDeducted = roundMoney(
      (allRow.advance ?? 0) +
        (allRow.payment ?? 0) +
        (allRow.deduction ?? 0) +
        (allRow.recovery ?? 0),
    );

    return {
      staffId: String(member._id),
      name: member.name,
      role: member.role,
      phone: member.phone,
      status: member.status === 'inactive' ? 'Inactive' : 'Active',
      salary: roundMoney(rangeRow.salary ?? 0),
      bonus: roundMoney(rangeRow.bonus ?? 0),
      advance: roundMoney(rangeRow.advance ?? 0),
      payment: roundMoney(rangeRow.payment ?? 0),
      deduction: roundMoney(rangeRow.deduction ?? 0),
      recovery: roundMoney(rangeRow.recovery ?? 0),
      paid: roundMoney((rangeRow.advance ?? 0) + (rangeRow.payment ?? 0)),
      entries: rangeRow.count ?? 0,
      remainingPayable: roundMoney(salaryPayable - paidAndDeducted),
    };
  });

  return {
    key: 'staff',
    title: 'Staff Report',
    description: 'Salary, payments, advances and remaining payable for each staff member.',
    range,
    filters: { search: toText(query.search) },
    summary: {
      staffCount: rows.length,
      activeCount: rows.filter((row) => row.status === 'Active').length,
      salary: roundMoney(rows.reduce((sum, row) => sum + row.salary, 0)),
      bonus: roundMoney(rows.reduce((sum, row) => sum + row.bonus, 0)),
      advance: roundMoney(rows.reduce((sum, row) => sum + row.advance, 0)),
      payments: roundMoney(rows.reduce((sum, row) => sum + row.payment, 0)),
      paid: roundMoney(rows.reduce((sum, row) => sum + row.paid, 0)),
      remainingPayable: roundMoney(
        rows.reduce((sum, row) => sum + row.remainingPayable, 0),
      ),
    },
    rows,
    notes: [
      'Range columns count entries in the selected period; remaining payable is the all-time ledger balance.',
      'Salary and bonus increase payable; advances, payments, deductions and recoveries reduce it.',
    ],
  };
};

const loanReport = async (query) => {
  const range = parseDateRange(query);
  const search = buildSearch(query.search, ['description', 'reference', 'transactionNumber']);
  const bankFilter = {
    type: { $in: ['loan-receipt', 'loan-repayment'] },
    transactionDate: { $gte: range.from, $lte: range.to },
    ...(search ?? {}),
  };
  const interestFilter = {
    categoryKey: LOAN_CATEGORY_KEY,
    expenseDate: { $gte: range.from, $lte: range.to },
    ...(search ?? {}),
  };

  const [bankRows, interestRows, accounts] = await Promise.all([
    BankTransaction.find(bankFilter)
      .select('transactionNumber type amount transactionDate description reference bankAccount')
      .lean(),
    Expense.find(interestFilter)
      .select('expenseNumber description amount account bankAccount expenseDate')
      .lean(),
    BankAccount.find().lean(),
  ]);

  const accountsById = new Map(accounts.map((account) => [String(account._id), account]));
  const rows = [
    ...bankRows.map((transaction) => {
      const account = accountsById.get(String(transaction.bankAccount));

      return {
        date: transaction.transactionDate,
        source: account
          ? `${account.bankName} · ${maskAccountNumber(account.accountNumber)}`
          : 'Bank',
        reference: transaction.transactionNumber,
        description: transaction.description,
        type: transaction.type === 'loan-receipt' ? 'Loan received' : 'Loan repayment',
        inflow: transaction.type === 'loan-receipt' ? roundMoney(transaction.amount) : 0,
        outflow: transaction.type === 'loan-repayment' ? roundMoney(transaction.amount) : 0,
      };
    }),
    ...interestRows.map((expense) => ({
      date: expense.expenseDate,
      source: ACCOUNT_LABELS[expense.account] ?? expense.account,
      reference: expense.expenseNumber,
      description: expense.description,
      type: 'Loan interest',
      inflow: 0,
      outflow: roundMoney(expense.amount),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const received = roundMoney(rows.reduce((sum, row) => sum + row.inflow, 0));
  const repaid = roundMoney(
    rows.filter((row) => row.type === 'Loan repayment').reduce((sum, row) => sum + row.outflow, 0),
  );
  const interest = roundMoney(
    rows.filter((row) => row.type === 'Loan interest').reduce((sum, row) => sum + row.outflow, 0),
  );

  return {
    key: 'loan',
    title: 'Loan Report',
    description: 'Loan receipts, repayments and loan interest recorded in the selected period.',
    range,
    filters: { search: toText(query.search) },
    summary: {
      received,
      repaid,
      interest,
      net: roundMoney(received - repaid - interest),
      count: rows.length,
    },
    rows,
    notes: [
      'Loan amounts are reported separately from sales and are never added to sales.',
      'Loan principal outstanding is not tracked because the loan module is not part of this release.',
    ],
  };
};

const REPORTS = {
  'daily-sales': dailySalesReport,
  'monthly-sales': monthlySalesReport,
  'sales-range': salesRangeReport,
  expenses: expenseReport,
  'cash-book': cashBookReport,
  bank: bankReport,
  'party-outstanding': partyOutstandingReport,
  'party-ledger': partyLedgerReport,
  stock: stockReport,
  production: productionReport,
  staff: staffReport,
  loan: loanReport,
};

export const REPORT_KEYS = Object.keys(REPORTS);

export const getReport = async (reportKey, query = {}) => {
  const key = toText(reportKey).toLowerCase();
  const handler = REPORTS[key];

  if (!handler) {
    throw httpError(404, 'Report not found.');
  }

  return handler(query);
};
