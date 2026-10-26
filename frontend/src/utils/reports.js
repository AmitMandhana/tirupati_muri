import { formatINR2, formatQuantity, formatReceiptDate } from './format';

export const REPORT_GROUPS = [
  {
    label: 'Sales',
    reports: [
      {
        key: 'daily-sales',
        title: 'Daily Sales',
        description: 'Retail bills and wholesale invoices for one day.',
        icon: 'billing',
      },
      {
        key: 'monthly-sales',
        title: 'Monthly Sales',
        description: 'Day-by-day sales for a month, compared with the previous month.',
        icon: 'reports',
      },
      {
        key: 'sales-range',
        title: 'Date Range Sales',
        description: 'Retail bills and wholesale invoices across any date range.',
        icon: 'reports',
      },
    ],
  },
  {
    label: 'Finance',
    reports: [
      {
        key: 'expenses',
        title: 'Expenses',
        description: 'Expenses by period with cash and bank split and category totals.',
        icon: 'expenses',
      },
      {
        key: 'cash-book',
        title: 'Cash Book',
        description: 'Daily opening cash, cash in, cash out and closing cash.',
        icon: 'cashbook',
      },
      {
        key: 'bank',
        title: 'Bank',
        description: 'Money in and money out across bank accounts.',
        icon: 'bank',
      },
    ],
  },
  {
    label: 'Parties',
    reports: [
      {
        key: 'party-outstanding',
        title: 'Party Outstanding',
        description: 'Balances owed by parties as of a selected date.',
        icon: 'parties',
      },
      {
        key: 'party-ledger',
        title: 'Party Ledger',
        description: 'Debits, credits and running balance for one party.',
        icon: 'parties',
      },
    ],
  },
  {
    label: 'Operations',
    reports: [
      {
        key: 'stock',
        title: 'Stock',
        description: 'Opening stock, stock in, stock out and closing stock.',
        icon: 'stock',
      },
      {
        key: 'production',
        title: 'Production',
        description: 'Batches, finished Muri, wastage and yield.',
        icon: 'production',
      },
      {
        key: 'staff',
        title: 'Staff',
        description: 'Salary, payments, advances and remaining payable.',
        icon: 'staff',
      },
    ],
  },
  {
    label: 'Loans',
    reports: [
      {
        key: 'loan',
        title: 'Loans',
        description: 'Loan receipts, repayments and loan interest.',
        icon: 'loans',
      },
    ],
  },
];

const salesColumns = [
  { key: 'date', label: 'Date', format: 'date', width: 0.8 },
  { key: 'type', label: 'Type', width: 0.7 },
  { key: 'reference', label: 'Reference', width: 1.1 },
  { key: 'name', label: 'Customer / Party', width: 1.7 },
  { key: 'product', label: 'Product', width: 1.4 },
  { key: 'quantity', label: 'Qty', format: 'quantity', width: 0.7 },
  { key: 'unit', label: 'Unit', width: 0.5 },
  { key: 'amount', label: 'Amount', format: 'money', width: 1 },
  { key: 'paid', label: 'Paid', format: 'money', width: 1 },
  { key: 'due', label: 'Due', format: 'money', width: 1 },
  { key: 'method', label: 'Method', width: 0.7 },
];

const salesSummary = [
  { key: 'retail', label: 'Retail sales', format: 'money' },
  { key: 'wholesale', label: 'Wholesale sales', format: 'money' },
  { key: 'total', label: 'Total sales', format: 'money' },
  { key: 'paid', label: 'Paid', format: 'money' },
  { key: 'due', label: 'Due', format: 'money' },
  { key: 'count', label: 'Bills', format: 'number' },
];

const REPORT_DEFINITIONS = {
  'daily-sales': {
    key: 'daily-sales',
    title: 'Daily Sales Report',
    description: 'Retail bills and wholesale invoices recorded on the selected day.',
    icon: 'billing',
    filters: { date: true, search: true },
    searchPlaceholder: 'Bill, customer, party or product',
    summary: salesSummary,
    columns: salesColumns,
    totals: ['quantity', 'amount', 'paid', 'due'],
    emptyText: 'No sales were recorded on this date.',
  },
  'monthly-sales': {
    key: 'monthly-sales',
    title: 'Monthly Sales Report',
    description: 'Day-by-day retail and wholesale sales for the selected month.',
    icon: 'reports',
    filters: { month: true },
    summary: [
      { key: 'retail', label: 'Retail sales', format: 'money' },
      { key: 'wholesale', label: 'Wholesale sales', format: 'money' },
      { key: 'total', label: 'Total sales', format: 'money' },
      { key: 'previousMonth', label: 'Previous month', format: 'money' },
      { key: 'change', label: 'Change', format: 'money' },
      { key: 'changePercent', label: 'Change %', format: 'percent' },
    ],
    columns: [
      { key: 'date', label: 'Date', format: 'dateKey', width: 1.2 },
      { key: 'retailCount', label: 'Retail bills', format: 'number', width: 0.8 },
      { key: 'wholesaleCount', label: 'Invoices', format: 'number', width: 0.8 },
      { key: 'retail', label: 'Retail sales', format: 'money', width: 1 },
      { key: 'wholesale', label: 'Wholesale sales', format: 'money', width: 1 },
      { key: 'total', label: 'Total sales', format: 'money', width: 1 },
    ],
    totals: ['retailCount', 'wholesaleCount', 'retail', 'wholesale', 'total'],
    emptyText: 'No sales were recorded in this month.',
  },
  'sales-range': {
    key: 'sales-range',
    title: 'Date Range Sales Report',
    description: 'Retail bills and wholesale invoices across the selected dates.',
    icon: 'reports',
    filters: { range: true, search: true },
    searchPlaceholder: 'Bill, customer, party or product',
    summary: salesSummary,
    columns: salesColumns,
    totals: ['quantity', 'amount', 'paid', 'due'],
    emptyText: 'No sales were recorded in this range.',
  },
  expenses: {
    key: 'expenses',
    title: 'Expense Report',
    description: 'Expenses recorded in the selected period, with cash and bank split.',
    icon: 'expenses',
    filters: { range: true, category: true, search: true },
    searchPlaceholder: 'Expense number, description or category',
    summary: [
      { key: 'total', label: 'Total expenses', format: 'money' },
      { key: 'cash', label: 'Paid in cash', format: 'money' },
      { key: 'bank', label: 'Paid from bank', format: 'money' },
      { key: 'count', label: 'Entries', format: 'number' },
    ],
    columns: [
      { key: 'date', label: 'Date', format: 'date', width: 0.8 },
      { key: 'reference', label: 'Expense no.', width: 1.1 },
      { key: 'category', label: 'Category', width: 1.3 },
      { key: 'description', label: 'Description', width: 2.2 },
      { key: 'method', label: 'Method', width: 0.8 },
      { key: 'account', label: 'Paid from', width: 0.8 },
      { key: 'amount', label: 'Amount', format: 'money', width: 1 },
    ],
    totals: ['amount'],
    extra: {
      key: 'categories',
      title: 'Category breakdown',
      columns: [
        { key: 'name', label: 'Category', width: 2 },
        { key: 'count', label: 'Entries', format: 'number', width: 0.8 },
        { key: 'amount', label: 'Amount', format: 'money', width: 1 },
      ],
      totals: ['amount'],
    },
    emptyText: 'No expenses were recorded in this range.',
  },
  'cash-book': {
    key: 'cash-book',
    title: 'Cash Book Report',
    description: 'Daily opening cash, cash in, cash out and closing cash.',
    icon: 'cashbook',
    filters: { range: true },
    summary: [
      { key: 'opening', label: 'Opening cash', format: 'money' },
      { key: 'inflow', label: 'Cash in', format: 'money' },
      { key: 'outflow', label: 'Cash out', format: 'money' },
      { key: 'net', label: 'Net movement', format: 'money' },
      { key: 'closing', label: 'Closing cash', format: 'money' },
    ],
    columns: [
      { key: 'date', label: 'Date', format: 'dateKey', width: 0.8 },
      { key: 'opening', label: 'Opening', format: 'money', width: 1 },
      { key: 'cashSales', label: 'Cash sales', format: 'money', width: 1 },
      { key: 'collections', label: 'Collections', format: 'money', width: 1 },
      { key: 'otherIncome', label: 'Other in', format: 'money', width: 0.9 },
      { key: 'expenses', label: 'Expenses', format: 'money', width: 0.9 },
      { key: 'staffPayments', label: 'Staff', format: 'money', width: 0.9 },
      { key: 'loanPayments', label: 'Loans', format: 'money', width: 0.9 },
      { key: 'otherOutflows', label: 'Other out', format: 'money', width: 0.9 },
      { key: 'inflow', label: 'In', format: 'money', width: 1 },
      { key: 'outflow', label: 'Out', format: 'money', width: 1 },
      { key: 'closing', label: 'Closing', format: 'money', width: 1 },
    ],
    totals: [
      'cashSales',
      'collections',
      'otherIncome',
      'expenses',
      'staffPayments',
      'loanPayments',
      'otherOutflows',
      'inflow',
      'outflow',
    ],
    emptyText: 'No cash movement was recorded in this range.',
  },
  bank: {
    key: 'bank',
    title: 'Bank Report',
    description: 'Bank transactions with money in, money out and net movement.',
    icon: 'bank',
    filters: { range: true, account: true, search: true },
    searchPlaceholder: 'Description, reference or transaction number',
    summary: [
      { key: 'inflow', label: 'Money in', format: 'money' },
      { key: 'outflow', label: 'Money out', format: 'money' },
      { key: 'net', label: 'Net movement', format: 'money' },
      { key: 'count', label: 'Transactions', format: 'number' },
    ],
    columns: [
      { key: 'date', label: 'Date', format: 'date', width: 0.8 },
      { key: 'account', label: 'Account', width: 1.6 },
      { key: 'reference', label: 'Reference', width: 1.1 },
      { key: 'type', label: 'Type', width: 1.1 },
      { key: 'description', label: 'Description', width: 2 },
      { key: 'inflow', label: 'In', format: 'money', width: 1 },
      { key: 'outflow', label: 'Out', format: 'money', width: 1 },
    ],
    totals: ['inflow', 'outflow'],
    emptyText: 'No bank transactions were recorded in this range.',
  },
  'party-outstanding': {
    key: 'party-outstanding',
    title: 'Party Outstanding Report',
    description: 'Parties with an outstanding balance as of the selected date.',
    icon: 'parties',
    filters: { asOf: true, search: true },
    searchPlaceholder: 'Party name or phone',
    summary: [
      { key: 'totalOutstanding', label: 'Total outstanding', format: 'money' },
      { key: 'partyCount', label: 'Parties owing', format: 'number' },
      { key: 'totalInvoiced', label: 'Invoiced', format: 'money' },
      { key: 'totalReceived', label: 'Received', format: 'money' },
    ],
    columns: [
      { key: 'name', label: 'Party', width: 1.8 },
      { key: 'phone', label: 'Phone', width: 1.1 },
      { key: 'opening', label: 'Opening', format: 'money', width: 1 },
      { key: 'invoiced', label: 'Invoiced', format: 'money', width: 1 },
      { key: 'received', label: 'Received', format: 'money', width: 1 },
      { key: 'outstanding', label: 'Outstanding', format: 'money', width: 1 },
      { key: 'creditLimit', label: 'Credit limit', format: 'money', width: 1 },
    ],
    totals: ['opening', 'invoiced', 'received', 'outstanding'],
    emptyText: 'No party has an outstanding balance as of this date.',
  },
  'party-ledger': {
    key: 'party-ledger',
    title: 'Party Ledger Report',
    description: 'Date, description, debit, credit and running balance for one party.',
    icon: 'parties',
    filters: { party: true, range: true },
    summary: [
      { key: 'opening', label: 'Opening balance', format: 'money' },
      { key: 'totalDebit', label: 'Total debit', format: 'money' },
      { key: 'totalCredit', label: 'Total credit', format: 'money' },
      { key: 'closing', label: 'Closing balance', format: 'money' },
      { key: 'invoiceCount', label: 'Invoices', format: 'number' },
      { key: 'paymentCount', label: 'Payments', format: 'number' },
    ],
    columns: [
      { key: 'date', label: 'Date', format: 'date', width: 0.9 },
      { key: 'type', label: 'Type', width: 0.9 },
      { key: 'reference', label: 'Reference', width: 1.2 },
      { key: 'description', label: 'Description', width: 2.4 },
      { key: 'debit', label: 'Debit', format: 'money', width: 1 },
      { key: 'credit', label: 'Credit', format: 'money', width: 1 },
      { key: 'balance', label: 'Balance', format: 'money', width: 1 },
    ],
    totals: ['debit', 'credit'],
    emptyText: 'No ledger entries were recorded in this range.',
  },
  stock: {
    key: 'stock',
    title: 'Stock Report',
    description: 'Opening stock, stock in, stock out and closing stock for the period.',
    icon: 'stock',
    filters: { range: true, search: true },
    searchPlaceholder: 'Product name',
    summary: [
      { key: 'productCount', label: 'Products', format: 'number' },
      { key: 'opening', label: 'Opening stock', format: 'quantity' },
      { key: 'inflow', label: 'Stock in', format: 'quantity' },
      { key: 'outflow', label: 'Stock out', format: 'quantity' },
      { key: 'closing', label: 'Closing stock', format: 'quantity' },
      { key: 'lowStockCount', label: 'Low stock', format: 'number' },
    ],
    columns: [
      { key: 'product', label: 'Product', width: 2 },
      { key: 'unit', label: 'Unit', width: 0.6 },
      {
        key: 'active',
        label: 'Status',
        format: 'flag',
        trueLabel: 'Active',
        falseLabel: 'Inactive',
        width: 0.9,
      },
      { key: 'opening', label: 'Opening', format: 'quantity', width: 1 },
      { key: 'inflow', label: 'In', format: 'quantity', width: 1 },
      { key: 'outflow', label: 'Out', format: 'quantity', width: 1 },
      { key: 'closing', label: 'Closing', format: 'quantity', width: 1 },
      {
        key: 'lowStock',
        label: 'Stock level',
        format: 'flag',
        trueLabel: 'Low',
        falseLabel: 'OK',
        width: 0.9,
      },
    ],
    totals: ['opening', 'inflow', 'outflow', 'closing'],
    emptyText: 'No products matched this report.',
  },
  production: {
    key: 'production',
    title: 'Production Report',
    description: 'Production batches, finished Muri and yield for the selected period.',
    icon: 'production',
    filters: { range: true, search: true },
    searchPlaceholder: 'Production number, product or notes',
    summary: [
      { key: 'batches', label: 'Batches', format: 'number' },
      { key: 'finishedKg', label: 'Finished', format: 'quantity' },
      { key: 'rawMaterialKg', label: 'Raw material', format: 'quantity' },
      { key: 'wastageKg', label: 'Wastage', format: 'quantity' },
      { key: 'averageYield', label: 'Average yield', format: 'percent' },
      { key: 'productionCost', label: 'Production cost', format: 'money' },
    ],
    columns: [
      { key: 'date', label: 'Date', format: 'date', width: 0.9 },
      { key: 'reference', label: 'Production no.', width: 1.2 },
      { key: 'product', label: 'Product', width: 1.6 },
      { key: 'rawMaterialKg', label: 'Raw KG', format: 'quantity', width: 1 },
      { key: 'finishedKg', label: 'Finished KG', format: 'quantity', width: 1 },
      { key: 'wastageKg', label: 'Wastage KG', format: 'quantity', width: 1 },
      { key: 'yieldPercent', label: 'Yield', format: 'percent', width: 0.9 },
      { key: 'cost', label: 'Cost', format: 'money', width: 1 },
    ],
    totals: ['rawMaterialKg', 'finishedKg', 'wastageKg', 'cost'],
    emptyText: 'No production batches were recorded in this range.',
  },
  staff: {
    key: 'staff',
    title: 'Staff Report',
    description: 'Salary, payments, advances and remaining payable for each staff member.',
    icon: 'staff',
    filters: { range: true, search: true },
    searchPlaceholder: 'Staff name, role or phone',
    summary: [
      { key: 'staffCount', label: 'Staff', format: 'number' },
      { key: 'activeCount', label: 'Active', format: 'number' },
      { key: 'salary', label: 'Salary', format: 'money' },
      { key: 'advance', label: 'Advances', format: 'money' },
      { key: 'paid', label: 'Paid in range', format: 'money' },
      { key: 'remainingPayable', label: 'Remaining payable', format: 'money' },
    ],
    columns: [
      { key: 'name', label: 'Staff', width: 1.5 },
      { key: 'role', label: 'Role', width: 1.2 },
      { key: 'status', label: 'Status', width: 0.8 },
      { key: 'salary', label: 'Salary', format: 'money', width: 1 },
      { key: 'bonus', label: 'Bonus', format: 'money', width: 0.9 },
      { key: 'advance', label: 'Advance', format: 'money', width: 0.9 },
      { key: 'payment', label: 'Payments', format: 'money', width: 1 },
      { key: 'deduction', label: 'Deduction', format: 'money', width: 0.9 },
      { key: 'recovery', label: 'Recovery', format: 'money', width: 0.9 },
      { key: 'paid', label: 'Paid', format: 'money', width: 1 },
      { key: 'remainingPayable', label: 'Payable', format: 'money', width: 1 },
    ],
    totals: [
      'salary',
      'bonus',
      'advance',
      'payment',
      'deduction',
      'recovery',
      'paid',
      'remainingPayable',
    ],
    emptyText: 'No staff members matched this report.',
  },
  loan: {
    key: 'loan',
    title: 'Loan Report',
    description: 'Loan receipts, repayments and loan interest recorded in the period.',
    icon: 'loans',
    filters: { range: true, search: true },
    searchPlaceholder: 'Description, reference or transaction number',
    summary: [
      { key: 'received', label: 'Loan received', format: 'money' },
      { key: 'repaid', label: 'Repaid', format: 'money' },
      { key: 'interest', label: 'Interest paid', format: 'money' },
      { key: 'net', label: 'Net movement', format: 'money' },
      { key: 'count', label: 'Entries', format: 'number' },
    ],
    columns: [
      { key: 'date', label: 'Date', format: 'date', width: 0.9 },
      { key: 'source', label: 'Source', width: 1.5 },
      { key: 'reference', label: 'Reference', width: 1.1 },
      { key: 'description', label: 'Description', width: 2.2 },
      { key: 'type', label: 'Type', width: 1.1 },
      { key: 'inflow', label: 'Received', format: 'money', width: 1 },
      { key: 'outflow', label: 'Paid', format: 'money', width: 1 },
    ],
    totals: ['inflow', 'outflow'],
    emptyText: 'No loan movements were recorded in this range.',
  },
};

export const REPORT_KEYS = Object.keys(REPORT_DEFINITIONS);

export const getReportDefinition = (key) => REPORT_DEFINITIONS[key];

const NUMERIC_FORMATS = new Set(['money', 'quantity', 'percent', 'number']);

const money = (value) => formatINR2(value);
const quantity = (value) => formatQuantity(value);
const percent = (value) =>
  value === null || value === undefined || value === ''
    ? '—'
    : `${Number(value).toFixed(2)}%`;

export const formatReportValue = (format, value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  switch (format) {
    case 'money':
      return money(value);
    case 'quantity':
      return quantity(value);
    case 'percent':
      return percent(value);
    case 'date':
      return formatReceiptDate(value);
    case 'dateKey':
      return formatReceiptDate(`${value}T12:00:00`);
    case 'number':
      return String(Number(value));
    default:
      return String(value);
  }
};

export const formatReportCell = (column, row) => {
  if (column.format === 'flag') {
    return row[column.key] ? column.trueLabel : column.falseLabel;
  }

  return formatReportValue(column.format, row[column.key]);
};

export const getColumnAlign = (column) =>
  column.align ?? (NUMERIC_FORMATS.has(column.format) ? 'right' : 'left');

export const getReportTotals = (definition, rows = []) => {
  const totals = {};

  (definition?.totals ?? []).forEach((key) => {
    totals[key] = rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
  });

  return totals;
};

export const getExtraTable = (definition, report) => {
  if (!definition?.extra) {
    return null;
  }

  const rows = report?.extra?.[definition.extra.key] ?? [];

  if (rows.length === 0) {
    return null;
  }

  return {
    title: definition.extra.title,
    columns: definition.extra.columns,
    rows,
    totals: getReportTotals(definition.extra, rows),
  };
};

export const describeReportFilters = (report) => {
  if (!report) {
    return '';
  }

  const filters = report.filters ?? {};
  const parts = [];

  if (filters.monthLabel) {
    parts.push(`Month: ${filters.monthLabel}`);
  }

  if (filters.asOf) {
    parts.push(`As of: ${formatReceiptDate(`${filters.asOf}T12:00:00`)}`);
  }

  if (filters.party) {
    parts.push(`Party: ${filters.party}`);
  }

  if (filters.account) {
    parts.push(`Account: ${filters.account}`);
  }

  if (filters.category) {
    parts.push(`Category: ${filters.category}`);
  }

  if (filters.search) {
    parts.push(`Search: "${filters.search}"`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'No extra filters';
};

export const getReportSummaryItems = (definition, report) =>
  (definition?.summary ?? [])
    .filter((field) => report?.summary?.[field.key] !== undefined)
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: formatReportValue(field.format ?? 'text', report.summary[field.key]),
    }));
