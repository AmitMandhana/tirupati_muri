import mongoose from 'mongoose';

import { BusinessSettings } from '../models/BusinessSettings.js';
import { Product } from '../models/Product.js';
import { ProductStock } from '../models/ProductStock.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { httpError } from '../utils/httpError.js';
import { MANUAL_MOVEMENT_TYPES } from '../utils/stockTypes.js';
import { toText } from '../utils/validators.js';

export const DEFAULT_LOW_STOCK_THRESHOLD = 100;

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundQuantity = (value) => roundTo(value, 6);

const parsePositiveQuantity = (value) => {
  const text = String(value ?? '').trim();

  if (!text) {
    throw httpError(400, 'Quantity is required.');
  }

  const quantity = Number(text);

  if (!Number.isFinite(quantity)) {
    throw httpError(400, 'Quantity must be a number.');
  }

  if (quantity <= 0) {
    throw httpError(400, 'Quantity must be greater than 0.');
  }

  return roundQuantity(quantity);
};

const parseAdjustmentQuantity = (value) => {
  const text = String(value ?? '').trim();

  if (!text) {
    throw httpError(400, 'Adjustment quantity is required.');
  }

  const quantity = Number(text);

  if (!Number.isFinite(quantity)) {
    throw httpError(400, 'Adjustment quantity must be a number.');
  }

  if (quantity === 0) {
    throw httpError(400, 'Adjustment quantity cannot be zero.');
  }

  return roundQuantity(quantity);
};

const parseNotes = (value) => {
  const notes = toText(value);

  if (notes.length > 500) {
    throw httpError(400, 'Notes cannot be longer than 500 characters.');
  }

  return notes;
};

const resolveProduct = async (productId) => {
  const id = toText(productId);

  if (!id || !mongoose.isValidObjectId(id)) {
    throw httpError(400, 'A valid product is required.');
  }

  const product = await Product.findById(id).lean();

  if (!product) {
    throw httpError(404, 'Product not found.');
  }

  return product;
};

const getLowStockThreshold = async () => {
  const settings = await BusinessSettings.findOne().lean();
  const threshold = Number(settings?.lowStockThresholdKg);

  return Number.isFinite(threshold) && threshold >= 0
    ? threshold
    : DEFAULT_LOW_STOCK_THRESHOLD;
};

const ensureStockDocument = async (productId) => {
  try {
    return await ProductStock.findOneAndUpdate(
      { product: productId },
      { $setOnInsert: { quantity: 0 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code === 11000) {
      return ProductStock.findOne({ product: productId });
    }

    throw error;
  }
};

const getCurrentQuantity = async (productId) => {
  const stock = await ProductStock.findOne({ product: productId }).lean();
  return roundQuantity(stock?.quantity ?? 0);
};

const insufficientStockError = (product, available) =>
  httpError(
    400,
    `Insufficient ${product.name} stock. Available: ${Number(available).toFixed(2)} ${product.unit}.`,
  );

const buildStockView = (product, stock, lowStockThreshold) => {
  const quantity = roundQuantity(stock?.quantity ?? 0);
  const bagWeight = Number(product.bagWeight) > 0 ? Number(product.bagWeight) : 0;

  return {
    productId: product._id,
    productName: product.name,
    unit: product.unit,
    active: product.active,
    quantity,
    bagWeight,
    bags: bagWeight > 0 ? roundTo(quantity / bagWeight, 2) : 0,
    openingRecorded: Boolean(stock?.openingRecorded),
    lowStockThreshold,
    lowStock: quantity < lowStockThreshold,
    lastTransactionAt: stock?.lastTransactionAt ?? null,
  };
};

const applySignedMovement = async ({
  product,
  type,
  delta,
  referenceId = '',
  referenceType = 'manual',
  notes = '',
  date = new Date(),
}) => {
  const now = date instanceof Date ? date : new Date(date);
  const roundedDelta = roundQuantity(delta);

  await ensureStockDocument(product._id);

  const filter = { product: product._id };

  if (roundedDelta < 0) {
    filter.quantity = { $gte: Math.abs(roundedDelta) };
  }

  const updated = await ProductStock.findOneAndUpdate(
    filter,
    { $inc: { quantity: roundedDelta }, $set: { lastTransactionAt: now } },
    { returnDocument: 'after' },
  ).lean();

  if (!updated) {
    const available = await getCurrentQuantity(product._id);
    throw insufficientStockError(product, available);
  }

  try {
    const transaction = await StockTransaction.create({
      product: product._id,
      type,
      quantity: roundedDelta,
      referenceId,
      referenceType,
      notes,
      date: now,
      balanceAfter: roundQuantity(updated.quantity),
    });

    return { transaction, quantity: roundQuantity(updated.quantity) };
  } catch (error) {
    await ProductStock.updateOne({ product: product._id }, { $inc: { quantity: -roundedDelta } });
    throw error;
  }
};

export const getStockOverview = async () => {
  const [products, stocks, lowStockThreshold] = await Promise.all([
    Product.find().sort({ active: -1, name: 1 }).lean(),
    ProductStock.find().lean(),
    getLowStockThreshold(),
  ]);

  const stockByProduct = new Map(stocks.map((stock) => [String(stock.product), stock]));

  return {
    lowStockThreshold,
    stocks: products.map((product) =>
      buildStockView(product, stockByProduct.get(String(product._id)), lowStockThreshold),
    ),
  };
};

export const getStockLedger = async (productId, requestedLimit) => {
  const product = await resolveProduct(productId);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 50;

  const [stock, lowStockThreshold, transactions] = await Promise.all([
    ProductStock.findOne({ product: product._id }).lean(),
    getLowStockThreshold(),
    StockTransaction.find({ product: product._id })
      .sort({ date: -1, _id: -1 })
      .limit(limit)
      .lean(),
  ]);

  return {
    product: {
      _id: product._id,
      name: product.name,
      unit: product.unit,
      active: product.active,
    },
    stock: buildStockView(product, stock, lowStockThreshold),
    transactions,
  };
};

export const recordOpeningStock = async (body = {}) => {
  const product = await resolveProduct(body.productId);
  const quantity = parsePositiveQuantity(body.quantity);
  const notes = parseNotes(body.notes);
  const now = new Date();

  await ensureStockDocument(product._id);

  const updated = await ProductStock.findOneAndUpdate(
    { product: product._id, openingRecorded: { $ne: true } },
    {
      $inc: { quantity },
      $set: { openingRecorded: true, lastTransactionAt: now },
    },
    { returnDocument: 'after' },
  ).lean();

  if (!updated) {
    throw httpError(
      409,
      'Opening stock has already been recorded for this product. Use an adjustment instead.',
    );
  }

  try {
    const transaction = await StockTransaction.create({
      product: product._id,
      type: 'opening',
      quantity,
      referenceType: 'opening',
      notes,
      date: now,
      balanceAfter: roundQuantity(updated.quantity),
    });

    return { transaction, quantity: roundQuantity(updated.quantity) };
  } catch (error) {
    await ProductStock.updateOne(
      { product: product._id },
      { $inc: { quantity: -quantity }, $set: { openingRecorded: false } },
    );
    throw error;
  }
};

export const recordManualMovement = async (body = {}) => {
  const product = await resolveProduct(body.productId);
  const type = toText(body.type);

  if (!MANUAL_MOVEMENT_TYPES.includes(type)) {
    throw httpError(400, 'Stock movement type must be purchase, wastage or adjustment.');
  }

  const quantity =
    type === 'adjustment'
      ? parseAdjustmentQuantity(body.quantity)
      : parsePositiveQuantity(body.quantity);
  const notes = parseNotes(body.notes);
  const delta = type === 'wastage' ? -quantity : quantity;

  return applySignedMovement({
    product,
    type,
    delta,
    referenceType: type,
    notes,
  });
};

export const reserveRetailStock = async (product, quantity) =>
  applySignedMovement({
    product,
    type: 'retailSale',
    delta: -roundQuantity(quantity),
    referenceType: 'sale',
  });

export const reserveWholesaleStock = async (product, quantity) =>
  applySignedMovement({
    product,
    type: 'wholesaleSale',
    delta: -roundQuantity(quantity),
    referenceType: 'sale',
  });

export const addProductionStock = async ({
  product,
  quantity,
  productionNumber,
  date,
  notes = '',
}) =>
  applySignedMovement({
    product,
    type: 'production',
    delta: roundQuantity(quantity),
    referenceId: productionNumber,
    referenceType: 'production',
    notes,
    date,
  });

export const attachSaleReference = async (transactionId, billNumber) => {
  await StockTransaction.updateOne(
    { _id: transactionId },
    { $set: { referenceId: billNumber } },
  );
};

export const releaseStockReservation = async (reservation) => {
  await ProductStock.updateOne(
    { product: reservation.transaction.product },
    { $inc: { quantity: -reservation.transaction.quantity } },
  );
  await StockTransaction.deleteOne({ _id: reservation.transaction._id });
};

export const restoreCancelledSaleStock = async ({
  product,
  quantity,
  referenceId,
  notes = '',
}) =>
  applySignedMovement({
    product,
    type: 'adjustment',
    delta: roundQuantity(quantity),
    referenceId,
    referenceType: 'sale',
    notes,
  });

export const reverseCancelledProductionStock = async ({
  product,
  quantity,
  referenceId,
  notes = '',
}) =>
  applySignedMovement({
    product,
    type: 'adjustment',
    delta: -roundQuantity(quantity),
    referenceId,
    referenceType: 'production',
    notes,
  });
