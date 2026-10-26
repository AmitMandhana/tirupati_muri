import mongoose from 'mongoose';

import { Staff, STAFF_STATUSES } from '../models/Staff.js';
import {
  STAFF_PAYMENT_ACCOUNTS,
  STAFF_PAYMENT_METHODS,
  STAFF_PAYMENT_TYPES,
  STAFF_TRANSACTION_TYPES,
  StaffTransaction,
} from '../models/StaffTransaction.js';
import { getNextStaffTransactionNumber } from './billNumberService.js';
import { recordBankMovement, resolveOptionalBankAccount } from './bankAccountService.js';
import {
  endOfLocalDay,
  getTodayDateKey,
  parseDateOnly,
  startOfLocalDay,
} from '../utils/dates.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegExp, isValidPhone, toText } from '../utils/validators.js';

const SALARY_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const PAYMENT_DESCRIPTIONS = {
  advance: 'Advance paid',
  payment: 'Salary payment',
  bonus: 'Bonus',
  deduction: 'Deduction',
  recovery: 'Loan / advance recovery',
};

const TYPE_LABELS = {
  salary: 'Salary',
  advance: 'Advance',
  payment: 'Salary payment',
  bonus: 'Bonus',
  deduction: 'Deduction',
  recovery: 'Recovery',
};

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);

const currentMonthKey = () => getTodayDateKey().slice(0, 7);

const monthLabel = (key) => {
  const [year, month] = String(key ?? '').split('-').map(Number);

  if (!year || !month || month < 1 || month > 12) {
    return String(key ?? '');
  }

  return `${MONTH_NAMES[month - 1]} ${year}`;
};

const parseMoney = (value, label, { required = false } = {}) => {
  const text = String(value ?? '').trim();

  if (!text) {
    if (required) {
      throw httpError(400, `${label} is required.`);
    }

    return 0;
  }

  const amount = Number(text);

  if (!Number.isFinite(amount) || amount < 0) {
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

const parseStatus = (value, fallback = 'active') => {
  const text = toText(value).toLowerCase();

  if (!text) {
    return fallback;
  }

  if (!STAFF_STATUSES.includes(text)) {
    throw httpError(400, 'Status must be active or inactive.');
  }

  return text;
};

const parseJoiningDate = (value) => {
  const date = parseDateOnly(value, 'Joining date');

  if (date > endOfLocalDay(new Date())) {
    throw httpError(400, 'Joining date cannot be in the future.');
  }

  return date;
};

const parseTransactionDate = (value) => {
  const date = parseDateOnly(value, 'Transaction date');

  if (date > endOfLocalDay(new Date())) {
    throw httpError(400, 'Transaction date cannot be in the future.');
  }

  return date;
};

const parseSalaryMonth = (value, { required = false } = {}) => {
  const text = toText(value);

  if (!text) {
    if (required) {
      throw httpError(400, 'Salary month is required.');
    }

    return '';
  }

  if (!SALARY_MONTH_PATTERN.test(text)) {
    throw httpError(400, 'Salary month must use the YYYY-MM format.');
  }

  if (text > currentMonthKey()) {
    throw httpError(400, 'Salary month cannot be in the future.');
  }

  return text;
};

const parseAccount = (paymentMethod, accountInput) => {
  const account = toText(accountInput).toLowerCase() || (paymentMethod === 'cash' ? 'cash' : 'bank');

  if (!STAFF_PAYMENT_ACCOUNTS.includes(account)) {
    throw httpError(400, 'Cash or bank account is required.');
  }

  if (paymentMethod === 'cash' && account !== 'cash') {
    throw httpError(400, 'Cash payments must be paid from the cash account.');
  }

  if (paymentMethod !== 'cash' && account !== 'bank') {
    throw httpError(400, 'UPI and bank payments must be paid from the bank account.');
  }

  return account;
};

const toStaffView = (staff) => ({
  _id: staff._id,
  name: staff.name,
  phone: staff.phone,
  role: staff.role,
  joiningDate: staff.joiningDate,
  monthlySalary: roundMoney(staff.monthlySalary ?? 0),
  status: staff.status ?? 'active',
  notes: staff.notes ?? '',
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

const toTransactionView = (transaction) => ({
  _id: transaction._id,
  transactionNumber: transaction.transactionNumber,
  staffId: transaction.staff,
  staffName: transaction.staffName,
  type: transaction.type,
  amount: roundMoney(transaction.amount),
  transactionDate: transaction.transactionDate,
  salaryMonth: transaction.salaryMonth ?? '',
  description: transaction.description,
  paymentMethod: transaction.paymentMethod ?? '',
  account: transaction.account ?? '',
  bankAccount: transaction.bankAccount ?? null,
  notes: transaction.notes ?? '',
  createdAt: transaction.createdAt,
});

const validateStaffPayload = (body = {}) => {
  const name = toText(body.name);
  const phone = toText(body.phone);
  const role = toText(body.role);

  if (!name) {
    throw httpError(400, 'Staff name is required.');
  }

  if (name.length > 150) {
    throw httpError(400, 'Staff name cannot be longer than 150 characters.');
  }

  if (!phone) {
    throw httpError(400, 'Staff phone is required.');
  }

  if (phone.length > 20 || !isValidPhone(phone)) {
    throw httpError(400, 'Enter a valid staff phone number.');
  }

  if (!role) {
    throw httpError(400, 'Staff role is required.');
  }

  if (role.length > 100) {
    throw httpError(400, 'Role cannot be longer than 100 characters.');
  }

  const joiningDate = parseJoiningDate(body.joiningDate);
  const monthlySalary = parseMoney(body.monthlySalary, 'Monthly salary', { required: true });

  if (monthlySalary <= 0) {
    throw httpError(400, 'Monthly salary must be greater than 0.');
  }

  const status = parseStatus(body.status);
  const notes = parseNotes(body.notes);

  return { name, phone, role, joiningDate, monthlySalary, status, notes };
};

const resolveStaff = async (staffId) => {
  if (!mongoose.isValidObjectId(staffId)) {
    throw httpError(404, 'Staff member not found.');
  }

  const staff = await Staff.findById(staffId).lean();

  if (!staff) {
    throw httpError(404, 'Staff member not found.');
  }

  return staff;
};

const buildStaffFilters = ({ search, status } = {}) => {
  const filters = {};
  const term = toText(search);

  if (term) {
    const pattern = new RegExp(escapeRegExp(term), 'i');
    filters.$or = [{ name: pattern }, { phone: pattern }, { role: pattern }];
  }

  const statusFilter = toText(status).toLowerCase();

  if (STAFF_STATUSES.includes(statusFilter)) {
    filters.status = statusFilter;
  }

  return filters;
};

const summarizeTransactions = (transactions) => {
  const totals = {
    salary: 0,
    bonus: 0,
    deduction: 0,
    recovery: 0,
    advance: 0,
    payment: 0,
    count: 0,
    lastTransactionAt: null,
    lastSalaryMonth: '',
  };

  transactions.forEach((transaction) => {
    const amount = roundMoney(transaction.amount ?? 0);
    const type = transaction.type;

    if (typeof totals[type] === 'number') {
      totals[type] = roundMoney(totals[type] + amount);
    }

    totals.count += 1;

    const time = new Date(transaction.transactionDate).getTime();

    if (
      !totals.lastTransactionAt ||
      time > new Date(totals.lastTransactionAt).getTime()
    ) {
      totals.lastTransactionAt = transaction.transactionDate;
    }

    if (
      type === 'salary' &&
      transaction.salaryMonth &&
      transaction.salaryMonth > totals.lastSalaryMonth
    ) {
      totals.lastSalaryMonth = transaction.salaryMonth;
    }
  });

  return totals;
};

const buildTotals = (row = {}) => {
  const salary = roundMoney(row.salary ?? 0);
  const bonus = roundMoney(row.bonus ?? 0);
  const deduction = roundMoney(row.deduction ?? 0);
  const recovery = roundMoney(row.recovery ?? 0);
  const advance = roundMoney(row.advance ?? 0);
  const payment = roundMoney(row.payment ?? 0);
  const salaryPayable = roundMoney(salary + bonus);
  const deductions = roundMoney(deduction + recovery);
  const paidToStaff = roundMoney(advance + payment);

  return {
    salary,
    bonus,
    deduction,
    recovery,
    advance,
    payment,
    salaryPayable,
    deductions,
    paymentsMade: payment,
    advancePaid: advance,
    paidToStaff,
    remainingPayable: roundMoney(salaryPayable - deductions - paidToStaff),
    entryCount: row.count ?? 0,
    lastTransactionAt: row.lastTransactionAt ?? null,
    lastSalaryMonth: row.lastSalaryMonth ?? '',
  };
};

const buildLedger = (transactions) => {
  let runningBalance = 0;

  return transactions.map((transaction) => {
    const amount = roundMoney(transaction.amount ?? 0);
    const isDebit = transaction.type === 'salary' || transaction.type === 'bonus';

    runningBalance = roundMoney(runningBalance + (isDebit ? amount : -amount));

    return {
      id: String(transaction._id),
      transactionNumber: transaction.transactionNumber,
      type: transaction.type,
      typeLabel: TYPE_LABELS[transaction.type] ?? transaction.type,
      date: transaction.transactionDate,
      reference: transaction.transactionNumber,
      description: transaction.description,
      salaryMonth: transaction.salaryMonth ?? '',
      debit: isDebit ? amount : 0,
      credit: isDebit ? 0 : amount,
      balance: runningBalance,
      meta: {
        paymentMethod: transaction.paymentMethod ?? '',
        account: transaction.account ?? '',
        notes: transaction.notes ?? '',
      },
    };
  });
};

const aggregateTotalsByStaff = async () => {
  const amountSum = (type) => ({
    $sum: { $cond: [{ $eq: ['$type', type] }, '$amount', 0] },
  });

  return StaffTransaction.aggregate([
    {
      $group: {
        _id: '$staff',
        salary: amountSum('salary'),
        bonus: amountSum('bonus'),
        deduction: amountSum('deduction'),
        recovery: amountSum('recovery'),
        advance: amountSum('advance'),
        payment: amountSum('payment'),
        count: { $sum: 1 },
        lastTransactionAt: { $max: '$transactionDate' },
        lastSalaryMonth: {
          $max: {
            $cond: [{ $eq: ['$type', 'salary'] }, '$salaryMonth', ''],
          },
        },
      },
    },
  ]);
};

const getStaffTotals = async (staffId) => {
  const transactions = await StaffTransaction.find({ staff: staffId }).lean();

  return buildTotals(summarizeTransactions(transactions));
};

export const listStaff = async (query = {}) => {
  const filters = buildStaffFilters(query);

  const [staff, rows] = await Promise.all([
    Staff.find(filters).sort({ status: 1, name: 1, _id: 1 }).limit(200).lean(),
    aggregateTotalsByStaff(),
  ]);

  const totalsByStaff = new Map(rows.map((row) => [String(row._id), buildTotals(row)]));
  const records = staff.map((member) => ({
    ...toStaffView(member),
    totals: totalsByStaff.get(String(member._id)) ?? buildTotals(),
  }));

  return {
    staff: records,
    summary: {
      staffCount: records.length,
      activeCount: records.filter((member) => member.status === 'active').length,
      totalPayable: roundMoney(
        records.reduce((sum, member) => sum + Math.max(member.totals.remainingPayable, 0), 0),
      ),
      monthlyPayroll: roundMoney(
        records
          .filter((member) => member.status === 'active')
          .reduce((sum, member) => sum + member.monthlySalary, 0),
      ),
      salaryMonth: currentMonthKey(),
    },
  };
};

export const createStaff = async (body = {}) => {
  const staff = await Staff.create(validateStaffPayload(body));

  return toStaffView(staff);
};

export const updateStaff = async (staffId, body = {}) => {
  await resolveStaff(staffId);
  const payload = validateStaffPayload(body);
  const staff = await Staff.findByIdAndUpdate(
    staffId,
    { $set: payload },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  return toStaffView(staff);
};

export const getStaffDetail = async (staffId) => {
  const staff = await resolveStaff(staffId);
  const transactions = await StaffTransaction.find({ staff: staff._id })
    .sort({ transactionDate: 1, createdAt: 1, _id: 1 })
    .lean();

  const totals = buildTotals(summarizeTransactions(transactions));

  return {
    staff: { ...toStaffView(staff), totals },
    summary: totals,
    ledger: buildLedger(transactions),
  };
};

export const getStaffSummary = async () => {
  const todayStart = startOfLocalDay(new Date());
  const todayEnd = endOfLocalDay(new Date());
  const month = currentMonthKey();

  const [staffRows, paymentRows, salaryRows, payableRows] = await Promise.all([
    Staff.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    StaffTransaction.aggregate([
      {
        $match: {
          type: { $in: STAFF_PAYMENT_TYPES },
          transactionDate: { $gte: todayStart, $lte: todayEnd },
        },
      },
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
    StaffTransaction.aggregate([
      { $match: { type: 'salary', salaryMonth: month } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    StaffTransaction.aggregate([
      {
        $group: {
          _id: '$staff',
          payable: {
            $sum: {
              $subtract: [
                {
                  $cond: [
                    { $in: ['$type', ['salary', 'bonus']] },
                    '$amount',
                    0,
                  ],
                },
                {
                  $cond: [
                    { $in: ['$type', ['advance', 'payment', 'deduction', 'recovery']] },
                    '$amount',
                    0,
                  ],
                },
              ],
            },
          },
        },
      },
    ]),
  ]);

  const paymentRow = paymentRows[0] ?? {};
  const salaryRow = salaryRows[0] ?? {};
  const activeCount = staffRows.find((row) => row._id === 'active')?.count ?? 0;
  const staffCount = staffRows.reduce((sum, row) => sum + (row.count ?? 0), 0);

  return {
    summary: {
      staffCount,
      activeCount,
      totalPayable: roundMoney(
        payableRows.reduce((sum, row) => sum + Math.max(row.payable ?? 0, 0), 0),
      ),
      todayPayments: {
        total: roundMoney(paymentRow.total ?? 0),
        cash: roundMoney(paymentRow.cash ?? 0),
        bank: roundMoney(paymentRow.bank ?? 0),
        count: paymentRow.count ?? 0,
      },
      monthlySalaryExpense: roundMoney(salaryRow.total ?? 0),
      monthlySalaryCount: salaryRow.count ?? 0,
      salaryMonth: month,
      salaryMonthLabel: monthLabel(month),
    },
  };
};

export const createStaffTransaction = async (staffId, body = {}) => {
  const staff = await resolveStaff(staffId);

  if (staff.status === 'inactive') {
    throw httpError(
      400,
      'This staff member is inactive. Reactivate them before adding transactions.',
    );
  }

  const type = toText(body.type).toLowerCase();

  if (!STAFF_TRANSACTION_TYPES.includes(type)) {
    throw httpError(400, 'Select a valid staff transaction type.');
  }

  const transactionDate = parseTransactionDate(body.transactionDate);
  const notes = parseNotes(body.notes);
  const isPayment = STAFF_PAYMENT_TYPES.includes(type);
  let salaryMonth = '';
  let amount;
  let description;

  if (type === 'salary') {
    salaryMonth = parseSalaryMonth(body.salaryMonth || currentMonthKey(), { required: true });

    const duplicate = await StaffTransaction.findOne({
      staff: staff._id,
      type: 'salary',
      salaryMonth,
    }).lean();

    if (duplicate) {
      throw httpError(
        409,
        `Salary for ${monthLabel(salaryMonth)} is already recorded for this staff member.`,
      );
    }

    amount = String(body.amount ?? '').trim()
      ? parseMoney(body.amount, 'Salary amount')
      : roundMoney(staff.monthlySalary ?? 0);
    description = toText(body.description) || `Salary for ${monthLabel(salaryMonth)}`;
  } else {
    amount = parseMoney(body.amount, 'Amount', { required: true });
    description = toText(body.description) || PAYMENT_DESCRIPTIONS[type] || 'Staff transaction';
  }

  if (amount <= 0) {
    throw httpError(400, `${type === 'salary' ? 'Salary amount' : 'Amount'} must be greater than 0.`);
  }

  if (description.length > 200) {
    throw httpError(400, 'Description cannot be longer than 200 characters.');
  }

  let paymentMethod;
  let account;
  let bankAccount = null;

  if (isPayment) {
    paymentMethod = toText(body.paymentMethod).toLowerCase() || 'cash';

    if (!STAFF_PAYMENT_METHODS.includes(paymentMethod)) {
      throw httpError(400, 'Payment method must be cash, upi or bank.');
    }

    account = parseAccount(paymentMethod, body.account);
    bankAccount = account === 'bank' ? await resolveOptionalBankAccount(body.bankAccountId) : null;
  }

  const transactionNumber = await getNextStaffTransactionNumber();
  let transaction;

  try {
    transaction = await StaffTransaction.create({
      transactionNumber,
      staff: staff._id,
      staffName: staff.name,
      type,
      amount,
      transactionDate,
      salaryMonth,
      description,
      ...(isPayment ? { paymentMethod, account, bankAccount: bankAccount?._id ?? null } : {}),
      notes,
    });

    if (bankAccount) {
      await recordBankMovement({
        bankAccountId: bankAccount._id,
        type: 'staff-payment',
        direction: 'outflow',
        amount,
        transactionDate,
        description: `${TYPE_LABELS[type] ?? 'Staff payment'} · ${staff.name}`,
        reference: transactionNumber,
        notes,
      });
    }
  } catch (error) {
    if (transaction) {
      await StaffTransaction.deleteOne({ _id: transaction._id });
    }

    if (error?.code === 11000) {
      throw httpError(
        409,
        `Salary for ${monthLabel(salaryMonth)} is already recorded for this staff member.`,
      );
    }

    throw error;
  }

  return {
    transaction: toTransactionView(transaction),
    summary: await getStaffTotals(staff._id),
  };
};
