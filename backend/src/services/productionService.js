import { Product } from '../models/Product.js';
import { Production } from '../models/Production.js';
import { getNextProductionNumber } from './billNumberService.js';
import { addProductionStock } from './stockService.js';
import { endOfLocalDay, parseDateOnly, startOfLocalDay } from '../utils/dates.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegExp, toText } from '../utils/validators.js';

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const parseWeight = (value, label) => {
  const text = String(value ?? '').trim();
  const weight = Number(text);

  if (!text || !Number.isFinite(weight) || weight <= 0) {
    throw httpError(400, `${label} must be greater than 0.`);
  }

  return roundTo(weight, 6);
};

const parseOptionalWeight = (value, label) => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const weight = Number(value);

  if (!Number.isFinite(weight) || weight < 0) {
    throw httpError(400, `${label} must be 0 or more.`);
  }

  return roundTo(weight, 6);
};

const parseCost = (value) => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const cost = Number(value);

  if (!Number.isFinite(cost) || cost < 0) {
    throw httpError(400, 'Production cost must be 0 or more.');
  }

  return roundTo(cost, 2);
};

const parseNotes = (value) => {
  const notes = toText(value);

  if (notes.length > 500) {
    throw httpError(400, 'Notes cannot be longer than 500 characters.');
  }

  return notes;
};

const parseProductionDate = (value) => {
  const productionDate = parseDateOnly(value, 'Production date');

  if (productionDate > endOfLocalDay(new Date())) {
    throw httpError(400, 'Production date cannot be in the future.');
  }

  return productionDate;
};

const resolveMuriProduct = async () => {
  const product =
    (await Product.findOne({ name: /^muri$/i }).lean()) ??
    (await Product.findOne({ active: true }).sort({ createdAt: 1, _id: 1 }).lean());

  if (!product) {
    throw httpError(400, 'Muri product not found. Add it in Product Management first.');
  }

  return product;
};

const calculateYieldPercent = (finishedKg, rawMaterialKg) =>
  rawMaterialKg > 0 ? roundTo((finishedKg / rawMaterialKg) * 100, 2) : null;

const calculateRawPerKg = (finishedKg, rawMaterialKg) =>
  finishedKg > 0 ? roundTo(rawMaterialKg / finishedKg, 4) : null;

const toProductionView = (production) => {
  const rawMaterialKg = roundTo(Number(production.rawMaterialKg) || 0, 6);
  const finishedKg = roundTo(Number(production.finishedKg) || 0, 6);

  return {
    _id: production._id,
    productionNumber: production.productionNumber,
    productId: production.product,
    productName: production.productName,
    unit: production.unit,
    productionDate: production.productionDate,
    rawMaterialKg,
    finishedKg,
    wastageKg: roundTo(Number(production.wastageKg) || 0, 6),
    productionCost: roundTo(Number(production.productionCost) || 0, 2),
    notes: production.notes ?? '',
    yieldPercent: calculateYieldPercent(finishedKg, rawMaterialKg),
    rawMaterialPerKg: calculateRawPerKg(finishedKg, rawMaterialKg),
    createdAt: production.createdAt,
  };
};

const buildFilter = (query = {}) => {
  const filter = {};
  const search = toText(query.search);

  if (search) {
    const pattern = new RegExp(escapeRegExp(search), 'i');
    filter.$or = [{ productionNumber: pattern }, { notes: pattern }];
  }

  const fromText = toText(query.from);
  const toTextValue = toText(query.to);
  const from = fromText ? parseDateOnly(fromText, 'From date') : null;
  const to = toTextValue ? endOfLocalDay(parseDateOnly(toTextValue, 'To date')) : null;

  if (from && to && from > to) {
    throw httpError(400, 'From date cannot be after the to date.');
  }

  if (from || to) {
    filter.productionDate = {};

    if (from) {
      filter.productionDate.$gte = from;
    }

    if (to) {
      filter.productionDate.$lte = to;
    }
  }

  return filter;
};

const summarize = async (match) => {
  const [row] = await Production.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        finishedKg: { $sum: '$finishedKg' },
        rawMaterialKg: { $sum: '$rawMaterialKg' },
        wastageKg: { $sum: '$wastageKg' },
        cost: { $sum: '$productionCost' },
        count: { $sum: 1 },
      },
    },
  ]);

  const finishedKg = roundTo(row?.finishedKg ?? 0, 6);
  const rawMaterialKg = roundTo(row?.rawMaterialKg ?? 0, 6);

  return {
    count: row?.count ?? 0,
    finishedKg,
    rawMaterialKg,
    wastageKg: roundTo(row?.wastageKg ?? 0, 6),
    productionCost: roundTo(row?.cost ?? 0, 2),
    yieldPercent: calculateYieldPercent(finishedKg, rawMaterialKg),
  };
};

export const createProduction = async (body = {}) => {
  const product = await resolveMuriProduct();
  const productionDate = parseProductionDate(body.productionDate);
  const rawMaterialKg = parseWeight(body.rawMaterialKg, 'Raw material quantity');
  const finishedKg = parseWeight(body.finishedKg, 'Finished muri quantity');
  const wastageKg = parseOptionalWeight(body.wastageKg, 'Wastage quantity');
  const productionCost = parseCost(body.productionCost);
  const notes = parseNotes(body.notes);
  const productionNumber = await getNextProductionNumber();
  let production;

  try {
    production = await Production.create({
      productionNumber,
      product: product._id,
      productName: product.name,
      unit: product.unit,
      productionDate,
      rawMaterialKg,
      finishedKg,
      wastageKg,
      productionCost,
      notes,
    });

    const stock = await addProductionStock({
      product,
      quantity: finishedKg,
      productionNumber,
      date: productionDate,
      notes: `Raw material ${rawMaterialKg} ${product.unit} → finished ${finishedKg} ${product.unit}`,
    });

    return {
      production: toProductionView(production),
      stock: {
        quantity: stock.quantity,
        unit: product.unit,
      },
    };
  } catch (error) {
    if (production) {
      await Production.deleteOne({ _id: production._id });
    }

    throw error;
  }
};

export const listProductions = async (query = {}) => {
  const filter = buildFilter(query);
  const productions = await Production.find(filter)
    .sort({ productionDate: -1, createdAt: -1, _id: -1 })
    .limit(200)
    .lean();
  const summary = await summarize(filter);

  return {
    productions: productions.map(toProductionView),
    summary,
  };
};

export const getProductionSummary = async () => {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [today, month, latest] = await Promise.all([
    summarize({ productionDate: { $gte: todayStart, $lte: todayEnd } }),
    summarize({ productionDate: { $gte: monthStart, $lte: todayEnd } }),
    Production.findOne()
      .sort({ productionDate: -1, createdAt: -1, _id: -1 })
      .lean(),
  ]);

  return {
    summary: {
      today,
      month,
      currentYieldPercent: latest
        ? calculateYieldPercent(
            roundTo(Number(latest.finishedKg) || 0, 6),
            roundTo(Number(latest.rawMaterialKg) || 0, 6),
          )
        : null,
      latestProduction: latest
        ? {
            productionNumber: latest.productionNumber,
            productionDate: latest.productionDate,
          }
        : null,
    },
  };
};
