import { Counter } from '../models/Counter.js';

const RETAIL_COUNTER_ID = 'retailSale';
const WHOLESALE_INVOICE_COUNTER_ID = 'wholesaleInvoice';

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
