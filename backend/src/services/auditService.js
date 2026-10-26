import { BankTransaction } from '../models/BankTransaction.js';
import { Expense } from '../models/Expense.js';
import { PartyPayment } from '../models/PartyPayment.js';
import { Production } from '../models/Production.js';
import { Sale } from '../models/Sale.js';
import { StaffTransaction } from '../models/StaffTransaction.js';
import { WholesaleInvoice } from '../models/WholesaleInvoice.js';
import { toText } from '../utils/validators.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const cancelledSince = (model, projection, sortField) =>
  model
    .find({ cancelled: true })
    .setOptions({ includeCancelled: true })
    .select(projection)
    .sort({ cancelledAt: -1, [sortField]: -1, _id: -1 })
    .limit(MAX_LIMIT)
    .lean();

const toRow = ({ type, reference, date, amount, description, document }) => ({
  id: String(document._id),
  type,
  reference: reference || '—',
  date: date ?? document.createdAt ?? null,
  amount: roundMoney(amount ?? 0),
  description: description ?? '',
  cancelledAt: document.cancelledAt ?? null,
  reason: document.cancelReason ?? '',
});

export const listCancelledTransactions = async (query = {}) => {
  const requestedLimit = Number.parseInt(query.limit, 10);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const search = toText(query.search).toLowerCase();

  const [sales, invoices, payments, expenses, staffTransactions, bankTransactions, productions] =
    await Promise.all([
      cancelledSince(Sale, 'billNumber amount customerName createdAt cancelledAt cancelReason', 'createdAt'),
      cancelledSince(
        WholesaleInvoice,
        'invoiceNumber partyName total createdAt cancelledAt cancelReason',
        'createdAt',
      ),
      cancelledSince(
        PartyPayment,
        'paymentNumber partyName amount paymentDate createdAt cancelledAt cancelReason',
        'paymentDate',
      ),
      cancelledSince(
        Expense,
        'expenseNumber description amount expenseDate createdAt cancelledAt cancelReason',
        'expenseDate',
      ),
      cancelledSince(
        StaffTransaction,
        'transactionNumber staffName description amount transactionDate createdAt cancelledAt cancelReason',
        'transactionDate',
      ),
      cancelledSince(
        BankTransaction,
        'transactionNumber description amount transactionDate createdAt cancelledAt cancelReason',
        'transactionDate',
      ),
      cancelledSince(
        Production,
        'productionNumber productName finishedKg unit productionDate createdAt cancelledAt cancelReason',
        'productionDate',
      ),
    ]);

  const rows = [
    ...sales.map((document) =>
      toRow({
        type: 'Retail sale',
        reference: document.billNumber,
        date: document.createdAt,
        amount: document.amount,
        description: document.customerName ? `Customer: ${document.customerName}` : 'Walk-in customer',
        document,
      }),
    ),
    ...invoices.map((document) =>
      toRow({
        type: 'Wholesale invoice',
        reference: document.invoiceNumber,
        date: document.createdAt,
        amount: document.total,
        description: `Party: ${document.partyName}`,
        document,
      }),
    ),
    ...payments.map((document) =>
      toRow({
        type: 'Party payment',
        reference: document.paymentNumber,
        date: document.paymentDate,
        amount: document.amount,
        description: `Party: ${document.partyName}`,
        document,
      }),
    ),
    ...expenses.map((document) =>
      toRow({
        type: 'Expense',
        reference: document.expenseNumber,
        date: document.expenseDate,
        amount: document.amount,
        description: document.description,
        document,
      }),
    ),
    ...staffTransactions.map((document) =>
      toRow({
        type: 'Staff transaction',
        reference: document.transactionNumber,
        date: document.transactionDate,
        amount: document.amount,
        description: `${document.staffName} · ${document.description}`,
        document,
      }),
    ),
    ...bankTransactions.map((document) =>
      toRow({
        type: 'Bank transaction',
        reference: document.transactionNumber,
        date: document.transactionDate,
        amount: document.amount,
        description: document.description,
        document,
      }),
    ),
    ...productions.map((document) =>
      toRow({
        type: 'Production batch',
        reference: document.productionNumber,
        date: document.productionDate,
        amount: 0,
        description: `${document.productName} · ${document.finishedKg} finished`,
        document,
      }),
    ),
  ]
    .filter((row) => {
      if (!search) {
        return true;
      }

      return [row.type, row.reference, row.description, row.reason]
        .join(' ')
        .toLowerCase()
        .includes(search);
    })
    .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt) || String(b.id).localeCompare(String(a.id)))
    .slice(0, limit);

  return {
    rows,
    total: rows.length,
    limit,
    note: 'Cancelled transactions are kept for the audit trail and are excluded from all ledgers, reports, dashboards and balances.',
  };
};
