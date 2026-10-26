import { BusinessSettings } from '../models/BusinessSettings.js';
import { CashAdjustment } from '../models/CashAdjustment.js';
import { Expense } from '../models/Expense.js';
import { Party } from '../models/Party.js';
import { PartyPayment } from '../models/PartyPayment.js';
import { Production } from '../models/Production.js';
import { Sale } from '../models/Sale.js';
import { STAFF_PAYMENT_TYPES, StaffTransaction } from '../models/StaffTransaction.js';
import { WholesaleInvoice } from '../models/WholesaleInvoice.js';
import { listBankAccounts } from './bankAccountService.js';
import { getCashBook } from './cashBookService.js';
import { getStockOverview } from './stockService.js';
import {
  addLocalDays,
  endOfLocalDay,
  parseDateOnly,
  startOfLocalDay,
  toLocalDateKey,
} from '../utils/dates.js';
import { httpError } from '../utils/httpError.js';
import { toText } from '../utils/validators.js';

const DASHBOARD_RANGES = ['today', 'week', 'month', 'custom'];
const STAFF_CATEGORY_KEY = 'salary';
const LOAN_CATEGORY_KEY = 'loan interest';
const MAX_CUSTOM_DAYS = 366;
const DAILY_CHART_MAX_DAYS = 62;

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);
const roundQuantity = (value) => roundTo(value, 6);

const dayLabelFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const monthLabelFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });
const rangeLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const resolveRange = (query = {}) => {
  const key = toText(query.range).toLowerCase() || 'today';

  if (!DASHBOARD_RANGES.includes(key)) {
    throw httpError(400, 'Dashboard range must be today, week, month or custom.');
  }

  const today = startOfLocalDay(new Date());
  const todayEnd = endOfLocalDay(today);
  let start = today;
  let end = todayEnd;

  if (key === 'week') {
    const weekOffset = (today.getDay() + 6) % 7;
    start = addLocalDays(today, -weekOffset);
  } else if (key === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (key === 'custom') {
    const fromKey = toText(query.from);
    const toKey = toText(query.to);

    if (!fromKey || !toKey) {
      throw httpError(400, 'Custom range requires both from and to dates.');
    }

    start = parseDateOnly(fromKey, 'From date');
    const customEnd = parseDateOnly(toKey, 'To date');

    if (startOfLocalDay(customEnd) > today) {
      throw httpError(400, 'Dashboard dates after today are not available.');
    }

    if (start > customEnd) {
      throw httpError(400, 'From date cannot be after the to date.');
    }

    end = endOfLocalDay(customEnd);
  }

  const days =
    Math.round(
      (startOfLocalDay(end).getTime() - startOfLocalDay(start).getTime()) / 86400000,
    ) + 1;

  if (days > MAX_CUSTOM_DAYS) {
    throw httpError(400, `Dashboard ranges cannot be longer than ${MAX_CUSTOM_DAYS} days.`);
  }

  const fromKey = toLocalDateKey(start);
  const toKey = toLocalDateKey(end);
  const labels = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    custom: `${rangeLabelFormatter.format(start)} – ${rangeLabelFormatter.format(end)}`,
  };
  const salesLabels = {
    today: "Today's Sales",
    week: "This Week's Sales",
    month: "This Month's Sales",
    custom: 'Sales in range',
  };
  const expenseLabels = {
    today: "Today's Expenses",
    week: "This Week's Expenses",
    month: "This Month's Expenses",
    custom: 'Expenses in range',
  };

  return {
    key,
    from: start,
    to: end,
    fromKey,
    toKey,
    days,
    label: labels[key],
    salesLabel: salesLabels[key],
    expenseLabel: expenseLabels[key],
  };
};

const salesTotals = async (from, to) => {
  const range = { $gte: from, $lte: to };

  const [retailRows, invoiceRows] = await Promise.all([
    Sale.aggregate([
      { $match: { saleType: 'retail', createdAt: range } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    WholesaleInvoice.aggregate([
      { $match: { createdAt: range } },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          paid: { $sum: '$paid' },
          due: { $sum: '$due' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const retailRow = retailRows[0] ?? {};
  const invoiceRow = invoiceRows[0] ?? {};
  const retail = roundMoney(retailRow.total ?? 0);
  const wholesale = roundMoney(invoiceRow.total ?? 0);

  return {
    retail,
    wholesale,
    total: roundMoney(retail + wholesale),
    retailCount: retailRow.count ?? 0,
    wholesaleCount: invoiceRow.count ?? 0,
    count: (retailRow.count ?? 0) + (invoiceRow.count ?? 0),
    wholesalePaid: roundMoney(invoiceRow.paid ?? 0),
    wholesaleDue: roundMoney(invoiceRow.due ?? 0),
  };
};

const buildChartBuckets = (from, to, days) => {
  if (days > DAILY_CHART_MAX_DAYS) {
    const buckets = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);

    while (cursor <= to) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label: monthLabelFormatter.format(cursor) });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { bucket: 'month', buckets };
  }

  const buckets = [];
  const cursor = startOfLocalDay(from);

  while (cursor <= to) {
    const key = toLocalDateKey(cursor);
    buckets.push({ key, label: dayLabelFormatter.format(cursor) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { bucket: 'day', buckets };
};

const salesSeries = async (from, to, days) => {
  const { bucket, buckets } = buildChartBuckets(from, to, days);
  const format = bucket === 'month' ? '%Y-%m' : '%Y-%m-%d';
  const range = { $gte: from, $lte: to };

  const [retailRows, invoiceRows] = await Promise.all([
    Sale.aggregate([
      { $match: { saleType: 'retail', createdAt: range } },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt', timezone: timeZone } },
          total: { $sum: '$amount' },
        },
      },
    ]),
    WholesaleInvoice.aggregate([
      { $match: { createdAt: range } },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt', timezone: timeZone } },
          total: { $sum: '$total' },
        },
      },
    ]),
  ]);

  const retailByKey = new Map(retailRows.map((row) => [row._id, roundMoney(row.total ?? 0)]));
  const wholesaleByKey = new Map(
    invoiceRows.map((row) => [row._id, roundMoney(row.total ?? 0)]),
  );

  return {
    bucket,
    points: buckets.map((entry) => {
      const retail = retailByKey.get(entry.key) ?? 0;
      const wholesale = wholesaleByKey.get(entry.key) ?? 0;

      return {
        key: entry.key,
        label: entry.label,
        retail,
        wholesale,
        total: roundMoney(retail + wholesale),
      };
    }),
  };
};

const expenseTotals = async (from, to) => {
  const [row] = await Expense.aggregate([
    { $match: { expenseDate: { $gte: from, $lte: to } } },
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

  return {
    total: roundMoney(row?.total ?? 0),
    cash: roundMoney(row?.cash ?? 0),
    bank: roundMoney(row?.bank ?? 0),
    count: row?.count ?? 0,
  };
};

const topExpenseCategories = async (from, to) => {
  const rows = await Expense.aggregate([
    { $match: { expenseDate: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { key: '$categoryKey', name: '$categoryName' },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { amount: -1, '_id.name': 1 } },
    { $limit: 5 },
  ]);

  return rows.map((row) => ({
    key: row._id?.key ?? '',
    name: row._id?.name ?? 'Uncategorised',
    amount: roundMoney(row.amount ?? 0),
    count: row.count ?? 0,
  }));
};

const emptyCashMovement = () => ({
  inflow: 0,
  outflow: 0,
  net: 0,
  components: {
    cashSales: 0,
    collections: 0,
    otherIncome: 0,
    expenses: 0,
    staffPayments: 0,
    loanPayments: 0,
    otherOutflows: 0,
  },
});

const cashMovement = async (from, to) => {
  const settings = await BusinessSettings.findOne().select('cashOpeningDate').lean();
  const openingDate = settings?.cashOpeningDate
    ? startOfLocalDay(settings.cashOpeningDate)
    : null;
  const effectiveFrom = openingDate && openingDate > from ? openingDate : from;

  if (effectiveFrom > to) {
    return emptyCashMovement();
  }

  const range = { $gte: effectiveFrom, $lte: to };

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
    ]);

  const expenseRow = expenseRows[0] ?? {};
  const adjustmentRow = adjustmentRows[0] ?? {};
  const cashSales = roundMoney((retailRows[0]?.total ?? 0) + (invoiceRows[0]?.total ?? 0));
  const collections = roundMoney(paymentRows[0]?.total ?? 0);
  const otherIncome = roundMoney(adjustmentRow.income ?? 0);
  const staffPayments = roundMoney(
    (expenseRow.staff ?? 0) + (staffRows[0]?.total ?? 0),
  );
  const loanPayments = roundMoney(expenseRow.loan ?? 0);
  const otherOutflows = roundMoney(adjustmentRow.outflow ?? 0);
  const expenses = roundMoney(
    (expenseRow.total ?? 0) - (expenseRow.staff ?? 0) - (expenseRow.loan ?? 0),
  );
  const inflow = roundMoney(cashSales + collections + otherIncome);
  const outflow = roundMoney(expenses + staffPayments + loanPayments + otherOutflows);

  return {
    inflow,
    outflow,
    net: roundMoney(inflow - outflow),
    components: {
      cashSales,
      collections,
      otherIncome,
      expenses,
      staffPayments,
      loanPayments,
      otherOutflows,
    },
  };
};

const receivables = async () => {
  const rows = await Party.aggregate([
    {
      $lookup: {
        from: 'wholesaleinvoices',
        localField: '_id',
        foreignField: 'party',
        as: 'invoices',
      },
    },
    {
      $lookup: {
        from: 'partypayments',
        localField: '_id',
        foreignField: 'party',
        as: 'payments',
      },
    },
    {
      $addFields: {
        outstanding: {
          $round: [
            {
              $subtract: [
                {
                  $add: [
                    { $ifNull: ['$openingBalance', 0] },
                    { $sum: '$invoices.total' },
                  ],
                },
                {
                  $add: [
                    { $sum: '$invoices.paid' },
                    { $sum: '$payments.amount' },
                  ],
                },
              ],
            },
            2,
          ],
        },
      },
    },
    { $match: { outstanding: { $gt: 0.005 } } },
    { $sort: { outstanding: -1, name: 1 } },
    { $project: { name: 1, phone: 1, outstanding: 1 } },
  ]);

  const mapped = rows.map((row) => ({
    partyId: String(row._id),
    name: row.name,
    phone: row.phone,
    outstanding: roundMoney(row.outstanding ?? 0),
  }));

  return {
    total: roundMoney(mapped.reduce((sum, row) => sum + row.outstanding, 0)),
    partyCount: mapped.length,
    topParties: mapped.slice(0, 5),
  };
};

const productionTotals = async (from, to) => {
  const [row] = await Production.aggregate([
    { $match: { productionDate: { $gte: from, $lte: to } } },
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
  ]);

  const finishedKg = roundQuantity(row?.finishedKg ?? 0);
  const rawMaterialKg = roundQuantity(row?.rawMaterialKg ?? 0);

  return {
    finishedKg,
    rawMaterialKg,
    wastageKg: roundQuantity(row?.wastageKg ?? 0),
    productionCost: roundMoney(row?.productionCost ?? 0),
    batches: row?.count ?? 0,
    averageYield: rawMaterialKg > 0 ? roundTo((finishedKg / rawMaterialKg) * 100, 2) : null,
  };
};

const resolveMuriStock = async () => {
  const overview = await getStockOverview();
  const items = Array.isArray(overview.stocks) ? overview.stocks : [];
  const muri =
    items.find((item) => String(item.productName).trim().toLowerCase() === 'muri') ??
    items.find((item) => item.active) ??
    items[0] ??
    null;

  if (!muri) {
    return null;
  }

  return {
    productName: muri.productName,
    quantity: roundQuantity(muri.quantity ?? 0),
    unit: muri.unit ?? 'KG',
    bags: muri.bags ?? 0,
    openingRecorded: Boolean(muri.openingRecorded),
    lowStock: Boolean(muri.lowStock),
    lowStockThreshold: roundQuantity(muri.lowStockThreshold ?? 0),
  };
};

export const getDashboard = async (query = {}) => {
  const range = resolveRange(query);
  const today = startOfLocalDay(new Date());
  const todayEnd = endOfLocalDay(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    0,
    23,
    59,
    59,
    999,
  );
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const previousMonthKey = `${previousMonthStart.getFullYear()}-${String(
    previousMonthStart.getMonth() + 1,
  ).padStart(2, '0')}`;

  const [
    rangeSales,
    series,
    currentMonthSales,
    previousMonthSales,
    rangeExpenses,
    todayExpenses,
    monthExpenses,
    topCategories,
    flow,
    receivableSummary,
    productionSummary,
    stock,
    cashBook,
    bank,
  ] = await Promise.all([
    salesTotals(range.from, range.to),
    salesSeries(range.from, range.to, range.days),
    salesTotals(monthStart, todayEnd),
    salesTotals(previousMonthStart, previousMonthEnd),
    expenseTotals(range.from, range.to),
    expenseTotals(today, todayEnd),
    expenseTotals(monthStart, todayEnd),
    topExpenseCategories(monthStart, todayEnd),
    cashMovement(range.from, range.to),
    receivables(),
    productionTotals(range.from, range.to),
    resolveMuriStock(),
    getCashBook(range.toKey),
    listBankAccounts(),
  ]);

  const changeAmount = roundMoney(currentMonthSales.total - previousMonthSales.total);
  const changePercent =
    previousMonthSales.total > 0
      ? roundTo((changeAmount / previousMonthSales.total) * 100, 1)
      : null;

  return {
    generatedAt: new Date(),
    range,
    cards: {
      sales: {
        label: range.salesLabel,
        value: rangeSales.total,
        retail: rangeSales.retail,
        wholesale: rangeSales.wholesale,
        count: rangeSales.count,
      },
      expenses: {
        label: range.expenseLabel,
        value: rangeExpenses.total,
        cash: rangeExpenses.cash,
        bank: rangeExpenses.bank,
        count: rangeExpenses.count,
      },
      cashInHand: {
        value: cashBook.summary.closingCash,
        beforeOpening: cashBook.beforeOpening,
        asOf: range.toKey,
      },
      bankBalance: {
        value: bank.summary.totalBalance,
        accountCount: bank.summary.accountCount,
        activeCount: bank.summary.activeCount,
      },
      partyReceivable: {
        value: receivableSummary.total,
        partyCount: receivableSummary.partyCount,
      },
      muriStock: {
        value: stock?.quantity ?? 0,
        productName: stock?.productName ?? 'Muri',
        unit: stock?.unit ?? 'KG',
        bags: stock?.bags ?? 0,
        lowStock: Boolean(stock?.lowStock),
        lowStockThreshold: stock?.lowStockThreshold ?? 0,
        openingRecorded: Boolean(stock?.openingRecorded),
      },
      production: {
        label: 'Production',
        value: productionSummary.finishedKg,
        unit: stock?.unit ?? 'KG',
        batches: productionSummary.batches,
        averageYield: productionSummary.averageYield,
      },
      loanOutstanding: {
        value: 0,
        tracked: false,
      },
    },
    sales: {
      retail: rangeSales.retail,
      wholesale: rangeSales.wholesale,
      total: rangeSales.total,
      count: rangeSales.count,
      retailCount: rangeSales.retailCount,
      wholesaleCount: rangeSales.wholesaleCount,
      wholesalePaid: rangeSales.wholesalePaid,
      wholesaleDue: rangeSales.wholesaleDue,
      series,
    },
    monthly: {
      current: {
        key: currentMonthKey,
        label: monthLabelFormatter.format(monthStart),
        retail: currentMonthSales.retail,
        wholesale: currentMonthSales.wholesale,
        total: currentMonthSales.total,
        count: currentMonthSales.count,
      },
      previous: {
        key: previousMonthKey,
        label: monthLabelFormatter.format(previousMonthStart),
        retail: previousMonthSales.retail,
        wholesale: previousMonthSales.wholesale,
        total: previousMonthSales.total,
        count: previousMonthSales.count,
      },
      change: {
        amount: changeAmount,
        percent: changePercent,
      },
    },
    expenses: {
      today: todayExpenses,
      month: monthExpenses,
      topCategories,
    },
    cashFlow: flow,
    receivables: receivableSummary,
    production: productionSummary,
    stock,
    notes: {
      loanOutstanding: 'Loan management is not part of this release, so no loan balance is tracked.',
      salesBasis: 'Sales are billed amounts and include credit invoices. Cash only changes on receipts.',
    },
  };
};

export const DASHBOARD_RANGE_OPTIONS = DASHBOARD_RANGES;
