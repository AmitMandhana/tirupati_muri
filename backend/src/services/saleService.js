import mongoose from 'mongoose';

import { Product } from '../models/Product.js';
import { Sale } from '../models/Sale.js';
import { getNextRetailBillNumber } from './billNumberService.js';
import {
  attachSaleReference,
  releaseStockReservation,
  reserveRetailStock,
} from './stockService.js';
import { httpError } from '../utils/httpError.js';
import { toText } from '../utils/validators.js';

export const PAYMENT_METHODS = ['cash', 'upi', 'bank', 'credit'];
const INPUT_MODES = ['amount', 'quantity'];

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const createRetailSale = async (body = {}) => {
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

  const inputMode = toText(body.inputMode) || 'amount';

  if (!INPUT_MODES.includes(inputMode)) {
    throw httpError(400, 'Input mode must be amount or quantity.');
  }

  const rateInput =
    body.rate === '' || body.rate === null || body.rate === undefined
      ? product.retailRate
      : parseNumber(body.rate);

  if (rateInput === null) {
    throw httpError(400, 'Rate is required and must be a number.');
  }

  const rate = roundTo(rateInput, 4);

  if (rate <= 0) {
    throw httpError(400, 'Rate must be greater than 0.');
  }

  let amount;
  let quantity;

  if (inputMode === 'amount') {
    const enteredAmount = parseNumber(body.amount);

    if (enteredAmount === null || enteredAmount <= 0) {
      throw httpError(400, 'Enter an amount greater than 0.');
    }

    amount = roundTo(enteredAmount, 2);
    quantity = roundTo(amount / rate, 6);
  } else {
    const enteredQuantity = parseNumber(body.quantity);

    if (enteredQuantity === null || enteredQuantity <= 0) {
      throw httpError(400, 'Enter a quantity greater than 0.');
    }

    quantity = roundTo(enteredQuantity, 6);
    amount = roundTo(quantity * rate, 2);
  }

  if (!(quantity > 0) || !(amount > 0)) {
    throw httpError(400, 'The calculated quantity and amount must be greater than 0.');
  }

  const paymentMethod = toText(body.paymentMethod).toLowerCase();

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw httpError(400, 'Payment method must be cash, upi, bank or credit.');
  }

  const customerName = toText(body.customerName);

  if (customerName.length > 150) {
    throw httpError(400, 'Customer name cannot be longer than 150 characters.');
  }

  if (paymentMethod === 'credit' && !customerName) {
    throw httpError(400, 'Customer or party name is required for credit sales.');
  }

  const notes = toText(body.notes);

  if (notes.length > 500) {
    throw httpError(400, 'Notes cannot be longer than 500 characters.');
  }

  const reservation = await reserveRetailStock(product, quantity);
  let sale;

  try {
    const billNumber = await getNextRetailBillNumber();
    await attachSaleReference(reservation.transaction._id, billNumber);

    sale = await Sale.create({
      billNumber,
      saleType: 'retail',
      product: product._id,
      productName: product.name,
      unit: product.unit,
      quantity,
      rate,
      amount,
      paymentMethod,
      customerName,
      notes,
    });
  } catch (error) {
    await releaseStockReservation(reservation);
    throw error;
  }

  return {
    sale,
    stock: {
      quantity: reservation.quantity,
      unit: product.unit,
    },
  };
};
