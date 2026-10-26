import mongoose from 'mongoose';

import { Party } from '../models/Party.js';
import { Product } from '../models/Product.js';
import { WholesaleInvoice } from '../models/WholesaleInvoice.js';
import { getNextWholesaleInvoiceNumber } from './billNumberService.js';
import {
  attachSaleReference,
  releaseStockReservation,
  reserveWholesaleStock,
} from './stockService.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegExp, toText } from '../utils/validators.js';

const PAYMENT_METHODS = ['cash', 'upi', 'bank', 'credit'];
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);
const roundQuantity = (value) => roundTo(value, 6);

const parsePositive = (value, label) => {
  const text = String(value ?? '').trim();
  const number = Number(text);

  if (!text || !Number.isFinite(number) || number <= 0) {
    throw httpError(400, `${label} must be greater than 0.`);
  }

  return number;
};

const parseDateBound = (value, endOfDay) => {
  const text = toText(value);

  if (!text) {
    return null;
  }

  const date = DATE_ONLY_PATTERN.test(text)
    ? new Date(`${text}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
    : new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw httpError(400, 'From and to dates must be valid dates.');
  }

  return date;
};

const buildFilters = ({ search, from, to } = {}) => {
  const filters = {};
  const term = toText(search);

  if (term) {
    const pattern = new RegExp(escapeRegExp(term), 'i');
    filters.$or = [
      { invoiceNumber: pattern },
      { partyName: pattern },
      { partyPhone: pattern },
    ];
  }

  const fromDate = parseDateBound(from, false);
  const toDate = parseDateBound(to, true);

  if (fromDate && toDate && fromDate > toDate) {
    throw httpError(400, 'The from date cannot be after the to date.');
  }

  if (fromDate || toDate) {
    filters.createdAt = {
      ...(fromDate ? { $gte: fromDate } : {}),
      ...(toDate ? { $lte: toDate } : {}),
    };
  }

  return filters;
};

export const createWholesaleInvoice = async (body = {}) => {
  const partyId = toText(body.partyId);

  if (!partyId || !mongoose.isValidObjectId(partyId)) {
    throw httpError(400, 'A valid party is required.');
  }

  const party = await Party.findById(partyId).lean();

  if (!party) {
    throw httpError(404, 'Party not found.');
  }

  const productId = toText(body.productId);

  if (!productId || !mongoose.isValidObjectId(productId)) {
    throw httpError(400, 'A valid product is required.');
  }

  const product = await Product.findById(productId).lean();

  if (!product) {
    throw httpError(404, 'Product not found.');
  }

  if (!product.active) {
    throw httpError(400, 'This product is inactive and cannot be sold.');
  }

  const quantity = roundQuantity(parsePositive(body.quantity, 'Quantity'));

  if (quantity <= 0) {
    throw httpError(400, 'Quantity must be greater than 0.');
  }

  const rateInput =
    body.rate === '' || body.rate === null || body.rate === undefined
      ? product.wholesaleRate
      : Number(body.rate);

  if (!Number.isFinite(rateInput) || rateInput <= 0) {
    throw httpError(400, 'Rate must be greater than 0.');
  }

  const rate = roundTo(rateInput, 4);
  const total = roundMoney(quantity * rate);

  if (total <= 0) {
    throw httpError(400, 'The invoice total must be greater than 0.');
  }

  const paidInput =
    body.paid === '' || body.paid === null || body.paid === undefined ? 0 : Number(body.paid);

  if (!Number.isFinite(paidInput) || paidInput < 0) {
    throw httpError(400, 'Amount received must be 0 or more.');
  }

  const paid = roundMoney(paidInput);

  if (paid > total) {
    throw httpError(400, 'Amount received cannot exceed the invoice total.');
  }

  const due = roundMoney(total - paid);

  const paymentMethod = toText(body.paymentMethod).toLowerCase();

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw httpError(400, 'Payment method must be cash, upi, bank or credit.');
  }

  const notes = toText(body.notes);

  if (notes.length > 500) {
    throw httpError(400, 'Notes cannot be longer than 500 characters.');
  }

  const status = due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'credit';
  const reservation = await reserveWholesaleStock(product, quantity);
  let invoice;

  try {
    const invoiceNumber = await getNextWholesaleInvoiceNumber();
    await attachSaleReference(reservation.transaction._id, invoiceNumber);

    invoice = await WholesaleInvoice.create({
      invoiceNumber,
      party: party._id,
      partyName: party.name,
      partyPhone: party.phone,
      product: product._id,
      productName: product.name,
      unit: product.unit,
      quantity,
      rate,
      amount: total,
      total,
      paid,
      due,
      paymentMethod,
      status,
      notes,
    });
  } catch (error) {
    await releaseStockReservation(reservation);
    throw error;
  }

  return {
    invoice,
    stock: {
      quantity: reservation.quantity,
      unit: product.unit,
    },
  };
};

export const listWholesaleInvoices = async (query = {}) => {
  const filters = buildFilters(query);
  const requestedLimit = Number.parseInt(query.limit, 10);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 500)
    : 100;

  const [invoices, rows] = await Promise.all([
    WholesaleInvoice.find(filters)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean(),
    WholesaleInvoice.aggregate([
      { $match: filters },
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

  const row = rows[0];

  return {
    invoices,
    summary: {
      total: roundMoney(row?.total ?? 0),
      paid: roundMoney(row?.paid ?? 0),
      due: roundMoney(row?.due ?? 0),
      count: row?.count ?? 0,
    },
  };
};

export const getWholesaleInvoice = async (invoiceId) => {
  if (!mongoose.isValidObjectId(invoiceId)) {
    throw httpError(404, 'Invoice not found.');
  }

  const invoice = await WholesaleInvoice.findById(invoiceId).lean();

  if (!invoice) {
    throw httpError(404, 'Invoice not found.');
  }

  return invoice;
};
