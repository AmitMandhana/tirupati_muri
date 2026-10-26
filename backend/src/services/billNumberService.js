import { Counter } from '../models/Counter.js';

const RETAIL_COUNTER_ID = 'retailSale';
const WHOLESALE_INVOICE_COUNTER_ID = 'wholesaleInvoice';
const PARTY_PAYMENT_COUNTER_ID = 'partyPayment';
const EXPENSE_COUNTER_ID = 'expense';
const CASH_ADJUSTMENT_COUNTER_ID = 'cashAdjustment';
const BANK_TRANSACTION_COUNTER_ID = 'bankTransaction';
const BANK_TRANSFER_COUNTER_ID = 'bankTransfer';
const PRODUCTION_COUNTER_ID = 'production';

export const formatRetailBillNumber = (sequence) => `R-${String(sequence).padStart(6, '0')}`;

export const getNextRetailBillNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: RETAIL_COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return formatRetailBillNumber(counter.seq);
};

export const formatWholesaleInvoiceNumber = (sequence) =>
  `INV-${String(sequence).padStart(6, '0')}`;

export const getNextWholesaleInvoiceNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: WHOLESALE_INVOICE_COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return formatWholesaleInvoiceNumber(counter.seq);
};

export const formatPartyPaymentNumber = (sequence) => `PAY-${String(sequence).padStart(6, '0')}`;

export const getNextPartyPaymentNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: PARTY_PAYMENT_COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return formatPartyPaymentNumber(counter.seq);
};

export const formatExpenseNumber = (sequence) => `EXP-${String(sequence).padStart(6, '0')}`;

export const getNextExpenseNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: EXPENSE_COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return formatExpenseNumber(counter.seq);
};

export const formatCashAdjustmentNumber = (sequence) =>
  `ADJ-${String(sequence).padStart(6, '0')}`;

export const getNextCashAdjustmentNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: CASH_ADJUSTMENT_COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return formatCashAdjustmentNumber(counter.seq);
};

export const formatBankTransactionNumber = (sequence) =>
  `BTX-${String(sequence).padStart(6, '0')}`;

export const getNextBankTransactionNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: BANK_TRANSACTION_COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return formatBankTransactionNumber(counter.seq);
};

export const formatBankTransferNumber = (sequence) =>
  `TRF-${String(sequence).padStart(6, '0')}`;

export const getNextBankTransferNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: BANK_TRANSFER_COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return formatBankTransferNumber(counter.seq);
};

export const formatProductionNumber = (sequence) => `PROD-${String(sequence).padStart(6, '0')}`;

export const getNextProductionNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: PRODUCTION_COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return formatProductionNumber(counter.seq);
};
