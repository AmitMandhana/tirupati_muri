import mongoose from 'mongoose';

import { BankTransaction } from '../models/BankTransaction.js';
import { Expense } from '../models/Expense.js';
import { PartyPayment } from '../models/PartyPayment.js';
import { Product } from '../models/Product.js';
import { Production } from '../models/Production.js';
import { Sale } from '../models/Sale.js';
import { StaffTransaction } from '../models/StaffTransaction.js';
import { WholesaleInvoice } from '../models/WholesaleInvoice.js';
import {
  restoreCancelledSaleStock,
  reverseCancelledProductionStock,
} from './stockService.js';
import { httpError } from '../utils/httpError.js';
import { toText } from '../utils/validators.js';

const resolveId = (value, label) => {
  const id = toText(value);

  if (!id || !mongoose.isValidObjectId(id)) {
    throw httpError(404, `${label} not found.`);
  }

  return id;
};

const parseReason = (value) => {
  const reason = toText(value);

  if (reason.length > 300) {
    throw httpError(400, 'Cancellation reason cannot be longer than 300 characters.');
  }

  return reason;
};

const cancelStamp = (reason) => ({
  cancelled: true,
  cancelledAt: new Date(),
  cancelReason: reason,
});

const markCancelled = async (model, id, reason, label) => {
  const document = await model
    .findOneAndUpdate(
      { _id: id, cancelled: { $ne: true } },
      { $set: cancelStamp(reason) },
      { returnDocument: 'after' },
    )
    .lean();

  if (!document) {
    throw httpError(404, `${label} not found or already cancelled.`);
  }

  return document;
};

const unmarkCancelled = (model, id) =>
  model.updateOne(
    { _id: id },
    { $set: { cancelled: false, cancelledAt: null, cancelReason: '' } },
  );

const findLinkedBankTransactions = (reference, types) =>
  reference
    ? BankTransaction.find({
        reference,
        type: { $in: types },
        cancelled: { $ne: true },
      })
        .select('_id')
        .lean()
    : [];

const markBankTransactions = (ids, reason) =>
  ids.length
    ? BankTransaction.updateMany({ _id: { $in: ids } }, { $set: cancelStamp(reason) })
    : null;

const unmarkBankTransactions = (ids) =>
  ids.length
    ? BankTransaction.updateMany(
        { _id: { $in: ids } },
        { $set: { cancelled: false, cancelledAt: null, cancelReason: '' } },
      )
    : null;

const cancellationNote = (label, reference, reason) =>
  `Cancelled ${label} ${reference}${reason ? ` · ${reason}` : ''}`;

export const cancelSale = async (saleId, body = {}) => {
  const id = resolveId(saleId, 'Sale');
  const sale = await Sale.findById(id).lean();

  if (!sale) {
    throw httpError(404, 'Sale not found or already cancelled.');
  }

  if (sale.saleType !== 'retail') {
    throw httpError(400, 'Only retail sales can be cancelled from this screen.');
  }

  const reason = parseReason(body.reason);
  const product = await Product.findById(sale.product).lean();

  if (!product) {
    throw httpError(404, 'The product for this sale no longer exists.');
  }

  const cancelled = await markCancelled(Sale, sale._id, reason, 'Sale');

  try {
    await restoreCancelledSaleStock({
      product,
      quantity: sale.quantity,
      referenceId: sale.billNumber,
      notes: cancellationNote('sale', sale.billNumber, reason),
    });
  } catch (error) {
    await unmarkCancelled(Sale, sale._id);
    throw error;
  }

  return {
    sale: cancelled,
    message: `Sale ${sale.billNumber} cancelled. Stock restored by ${sale.quantity} ${sale.unit}.`,
  };
};

export const cancelInvoice = async (invoiceId, body = {}) => {
  const id = resolveId(invoiceId, 'Invoice');
  const invoice = await WholesaleInvoice.findById(id).lean();

  if (!invoice) {
    throw httpError(404, 'Invoice not found or already cancelled.');
  }

  const reason = parseReason(body.reason);
  const product = await Product.findById(invoice.product).lean();

  if (!product) {
    throw httpError(404, 'The product for this invoice no longer exists.');
  }

  const cancelled = await markCancelled(
    WholesaleInvoice,
    invoice._id,
    reason,
    'Invoice',
  );
  const bankIds = await findLinkedBankTransactions(invoice.invoiceNumber, [
    'sales-collection',
  ]);
  let bankMarked = false;

  try {
    if (bankIds.length) {
      await markBankTransactions(bankIds, reason);
      bankMarked = true;
    }

    await restoreCancelledSaleStock({
      product,
      quantity: invoice.quantity,
      referenceId: invoice.invoiceNumber,
      notes: cancellationNote('invoice', invoice.invoiceNumber, reason),
    });
  } catch (error) {
    if (bankMarked) {
      await unmarkBankTransactions(bankIds);
    }

    await unmarkCancelled(WholesaleInvoice, invoice._id);
    throw error;
  }

  return {
    invoice: cancelled,
    message: `Invoice ${invoice.invoiceNumber} cancelled. Stock restored by ${invoice.quantity} ${invoice.unit}.`,
  };
};

export const cancelPartyPayment = async (paymentId, body = {}) => {
  const id = resolveId(paymentId, 'Payment');
  const payment = await PartyPayment.findById(id).lean();

  if (!payment) {
    throw httpError(404, 'Payment not found or already cancelled.');
  }

  const reason = parseReason(body.reason);
  const cancelled = await markCancelled(PartyPayment, payment._id, reason, 'Payment');
  const bankIds = await findLinkedBankTransactions(payment.paymentNumber, [
    'party-payment',
  ]);

  try {
    if (bankIds.length) {
      await markBankTransactions(bankIds, reason);
    }
  } catch (error) {
    await unmarkBankTransactions(bankIds);
    await unmarkCancelled(PartyPayment, payment._id);
    throw error;
  }

  return {
    payment: cancelled,
    message: `Payment ${payment.paymentNumber} cancelled. The party ledger is updated.`,
  };
};

export const cancelExpense = async (expenseId, body = {}) => {
  const id = resolveId(expenseId, 'Expense');
  const expense = await Expense.findById(id).lean();

  if (!expense) {
    throw httpError(404, 'Expense not found or already cancelled.');
  }

  const reason = parseReason(body.reason);
  const cancelled = await markCancelled(Expense, expense._id, reason, 'Expense');
  const bankIds = await findLinkedBankTransactions(expense.expenseNumber, ['expense']);

  try {
    if (bankIds.length) {
      await markBankTransactions(bankIds, reason);
    }
  } catch (error) {
    await unmarkBankTransactions(bankIds);
    await unmarkCancelled(Expense, expense._id);
    throw error;
  }

  return {
    expense: cancelled,
    message: `Expense ${expense.expenseNumber} cancelled. Cash and bank books are updated.`,
  };
};

export const cancelStaffTransaction = async (transactionId, body = {}) => {
  const id = resolveId(transactionId, 'Staff transaction');
  const transaction = await StaffTransaction.findById(id).lean();

  if (!transaction) {
    throw httpError(404, 'Staff transaction not found or already cancelled.');
  }

  const reason = parseReason(body.reason);
  const cancelled = await markCancelled(
    StaffTransaction,
    transaction._id,
    reason,
    'Staff transaction',
  );

  if (transaction.type === 'salary') {
    // Release the one-salary-per-month unique index so the month can be re-entered.
    await StaffTransaction.updateOne(
      { _id: transaction._id },
      { $set: { salaryMonth: `${transaction.salaryMonth}#cancelled-${Date.now()}` } },
    );
  }

  const bankIds = await findLinkedBankTransactions(transaction.transactionNumber, [
    'staff-payment',
  ]);

  try {
    if (bankIds.length) {
      await markBankTransactions(bankIds, reason);
    }
  } catch (error) {
    await unmarkBankTransactions(bankIds);
    await unmarkCancelled(StaffTransaction, transaction._id);

    if (transaction.type === 'salary') {
      await StaffTransaction.updateOne(
        { _id: transaction._id },
        { $set: { salaryMonth: transaction.salaryMonth } },
      );
    }

    throw error;
  }

  return {
    transaction: cancelled,
    message: `Staff transaction ${transaction.transactionNumber} cancelled. The staff ledger is updated.`,
  };
};

export const cancelProduction = async (productionId, body = {}) => {
  const id = resolveId(productionId, 'Production batch');
  const production = await Production.findById(id).lean();

  if (!production) {
    throw httpError(404, 'Production batch not found or already cancelled.');
  }

  const reason = parseReason(body.reason);
  const product = await Product.findById(production.product).lean();

  if (!product) {
    throw httpError(404, 'The product for this production batch no longer exists.');
  }

  const cancelled = await markCancelled(
    Production,
    production._id,
    reason,
    'Production batch',
  );

  try {
    await reverseCancelledProductionStock({
      product,
      quantity: production.finishedKg,
      referenceId: production.productionNumber,
      notes: cancellationNote('production batch', production.productionNumber, reason),
    });
  } catch (error) {
    await unmarkCancelled(Production, production._id);

    if (error?.statusCode === 400) {
      throw httpError(
        400,
        `Cannot cancel ${production.productionNumber}: not enough ${product.name} stock remains to reverse ${production.finishedKg} ${production.unit}.`,
      );
    }

    throw error;
  }

  return {
    production: cancelled,
    message: `Production batch ${production.productionNumber} cancelled. ${production.finishedKg} ${production.unit} removed from stock.`,
  };
};

const LINKED_SOURCES = [
  { model: WholesaleInvoice, field: 'invoiceNumber', label: 'invoice' },
  { model: PartyPayment, field: 'paymentNumber', label: 'party payment' },
  { model: Expense, field: 'expenseNumber', label: 'expense' },
  { model: StaffTransaction, field: 'transactionNumber', label: 'staff transaction' },
];

export const cancelBankTransaction = async (accountId, transactionId, body = {}) => {
  const account = resolveId(accountId, 'Bank account');
  const id = resolveId(transactionId, 'Bank transaction');
  const transaction = await BankTransaction.findOne({
    _id: id,
    bankAccount: account,
  }).lean();

  if (!transaction) {
    throw httpError(404, 'Bank transaction not found or already cancelled.');
  }

  const reason = parseReason(body.reason);

  if (transaction.transferId) {
    await BankTransaction.updateMany(
      { transferId: transaction.transferId, cancelled: { $ne: true } },
      { $set: cancelStamp(reason) },
    );

    return {
      message: 'Bank transfer cancelled on both accounts.',
    };
  }

  if (transaction.reference) {
    for (const source of LINKED_SOURCES) {
      const exists = await source.model
        .findOne({ [source.field]: transaction.reference })
        .select('_id')
        .lean();

      if (exists) {
        throw httpError(
          400,
          `This bank entry was created by ${source.label} ${transaction.reference}. Cancel the ${source.label} instead.`,
        );
      }
    }
  }

  const cancelled = await markCancelled(
    BankTransaction,
    transaction._id,
    reason,
    'Bank transaction',
  );

  return {
    transaction: cancelled,
    message: `Bank transaction ${transaction.transactionNumber} cancelled.`,
  };
};
