import { BankAccount } from '../models/BankAccount.js';
import { BankTransaction } from '../models/BankTransaction.js';
import { BusinessSettings } from '../models/BusinessSettings.js';
import { CashAdjustment } from '../models/CashAdjustment.js';
import { CashCount } from '../models/CashCount.js';
import { Expense } from '../models/Expense.js';
import { ExpenseCategory } from '../models/ExpenseCategory.js';
import { Party } from '../models/Party.js';
import { PartyPayment } from '../models/PartyPayment.js';
import { Product } from '../models/Product.js';
import { Production } from '../models/Production.js';
import { Sale } from '../models/Sale.js';
import { Staff } from '../models/Staff.js';
import { StaffTransaction } from '../models/StaffTransaction.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { User } from '../models/User.js';
import { WholesaleInvoice } from '../models/WholesaleInvoice.js';
import { getTodayDateKey } from '../utils/dates.js';
import { httpError } from '../utils/httpError.js';

const DATASETS = [
  {
    key: 'products',
    label: 'Products',
    model: Product,
    sort: { name: 1, _id: 1 },
  },
  {
    key: 'parties',
    label: 'Parties',
    model: Party,
    sort: { name: 1, _id: 1 },
  },
  {
    key: 'sales',
    label: 'Retail sales',
    model: Sale,
    sort: { createdAt: 1, _id: 1 },
  },
  {
    key: 'invoices',
    label: 'Wholesale invoices',
    model: WholesaleInvoice,
    sort: { createdAt: 1, _id: 1 },
  },
  {
    key: 'payments',
    label: 'Party payments',
    model: PartyPayment,
    sort: { paymentDate: 1, _id: 1 },
  },
  {
    key: 'expenses',
    label: 'Expenses',
    model: Expense,
    sort: { expenseDate: 1, _id: 1 },
  },
  {
    key: 'expense-categories',
    label: 'Expense categories',
    model: ExpenseCategory,
    sort: { sortOrder: 1, name: 1 },
  },
  {
    key: 'staff',
    label: 'Staff',
    model: Staff,
    sort: { name: 1, _id: 1 },
  },
  {
    key: 'staff-transactions',
    label: 'Staff transactions',
    model: StaffTransaction,
    sort: { transactionDate: 1, _id: 1 },
  },
  {
    key: 'bank-accounts',
    label: 'Bank accounts',
    model: BankAccount,
    sort: { bankName: 1, accountName: 1, _id: 1 },
  },
  {
    key: 'bank-transactions',
    label: 'Bank transactions',
    model: BankTransaction,
    sort: { transactionDate: 1, _id: 1 },
  },
  {
    key: 'production',
    label: 'Muri production',
    model: Production,
    sort: { productionDate: 1, _id: 1 },
  },
  {
    key: 'stock-transactions',
    label: 'Stock transactions',
    model: StockTransaction,
    sort: { date: 1, _id: 1 },
  },
  {
    key: 'cash-counts',
    label: 'Daily cash counts',
    model: CashCount,
    sort: { countDate: 1, _id: 1 },
  },
  {
    key: 'cash-adjustments',
    label: 'Cash adjustments',
    model: CashAdjustment,
    sort: { adjustmentDate: 1, _id: 1 },
  },
];

const DATASET_BY_KEY = new Map(DATASETS.map((dataset) => [dataset.key, dataset]));

const loadDataset = async (dataset) =>
  dataset.model
    .find({})
    .setOptions({ includeCancelled: true })
    .sort(dataset.sort)
    .lean();

const loadAllData = async () => {
  const [settings, users, ...collections] = await Promise.all([
    BusinessSettings.findOne().lean(),
    User.find().select('name email createdAt updatedAt').lean(),
    ...DATASETS.map(loadDataset),
  ]);

  return {
    settings: settings ?? null,
    users,
    ...Object.fromEntries(
      DATASETS.map((dataset, index) => [dataset.key, collections[index]]),
    ),
  };
};

export const listBackupDatasets = () =>
  DATASETS.map(({ key, label }) => ({ key, label }));

export const buildBackup = async () => {
  const data = await loadAllData();
  const counts = Object.fromEntries(
    DATASETS.map((dataset) => [dataset.key, data[dataset.key].length]),
  );

  return {
    meta: {
      application: 'Tirupati Puffed Rice Mill',
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedOn: getTodayDateKey(),
      counts,
      note: 'Contains business data only. Password hashes and environment secrets are never included.',
    },
    ...data,
  };
};

const flattenValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const flattenRow = (row, prefix = '', output = {}) => {
  Object.entries(row).forEach(([key, value]) => {
    if (key === '__v') {
      return;
    }

    const path = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !(value instanceof Buffer) &&
      typeof value.toHexString !== 'function'
    ) {
      flattenRow(value, path, output);
      return;
    }

    output[path] = flattenValue(value);
  });

  return output;
};

const escapeCsv = (value) => {
  const text = String(value ?? '');

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

export const buildCsv = async (datasetKey) => {
  const dataset = DATASET_BY_KEY.get(String(datasetKey ?? ''));

  if (!dataset) {
    throw httpError(400, 'Choose a valid dataset to export.');
  }

  const records = await loadDataset(dataset);
  const rows = records.map((record) => flattenRow(record));
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  const lines = [
    columns.map(escapeCsv).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(',')),
  ];

  return {
    filename: `${dataset.key}-${getTodayDateKey()}.csv`,
    content: lines.join('\r\n'),
    rowCount: rows.length,
  };
};
