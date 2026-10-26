import { Counter } from '../models/Counter.js';

const RETAIL_COUNTER_ID = 'retailSale';
const WHOLESALE_INVOICE_COUNTER_ID = 'wholesaleInvoice';
const PARTY_PAYMENT_COUNTER_ID = 'partyPayment';

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
