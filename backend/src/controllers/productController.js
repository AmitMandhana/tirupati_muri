import { Product } from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegExp, toText } from '../utils/validators.js';

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const buildProductPayload = (body) => {
  const payload = {
    name: toText(body.name),
    unit: toText(body.unit) || 'KG',
    retailRate: toNumber(body.retailRate),
    wholesaleRate: toNumber(body.wholesaleRate),
    bagWeight: toNumber(body.bagWeight),
    active: body.active,
  };

  if (!payload.name) {
    throw httpError(400, 'Product name is required.');
  }

  if (payload.name.length > 100) {
    throw httpError(400, 'Product name cannot be longer than 100 characters.');
  }

  if (payload.unit.length > 20) {
    throw httpError(400, 'Unit cannot be longer than 20 characters.');
  }

  if (payload.retailRate === null) {
    throw httpError(400, 'Retail rate is required and must be a number.');
  }

  if (payload.retailRate < 0) {
    throw httpError(400, 'Retail rate cannot be negative.');
  }

  if (payload.wholesaleRate === null) {
    throw httpError(400, 'Wholesale rate is required and must be a number.');
  }

  if (payload.wholesaleRate < 0) {
    throw httpError(400, 'Wholesale rate cannot be negative.');
  }

  if (payload.bagWeight === null) {
    throw httpError(400, 'Bag weight is required and must be a number.');
  }

  if (payload.bagWeight <= 0) {
    throw httpError(400, 'Bag weight must be greater than 0.');
  }

  if (payload.active !== undefined && typeof payload.active !== 'boolean') {
    throw httpError(400, 'Active status must be true or false.');
  }

  return payload;
};

export const listProducts = asyncHandler(async (req, res) => {
  const { active, search } = req.query;
  const filter = {};

  if (active === 'true' || active === 'false') {
    filter.active = active === 'true';
  } else if (active !== undefined) {
    throw httpError(400, 'Active filter must be true or false.');
  }

  const searchText = toText(search);
  if (searchText) {
    if (searchText.length > 100) {
      throw httpError(400, 'Search text cannot be longer than 100 characters.');
    }

    filter.name = { $regex: escapeRegExp(searchText), $options: 'i' };
  }

  const products = await Product.find(filter).sort({ active: -1, name: 1 }).lean();

  return res.status(200).json({ products });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();

  if (!product) {
    throw httpError(404, 'Product not found.');
  }

  return res.status(200).json({ product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const payload = buildProductPayload(req.body);
  const product = await Product.create(payload);

  return res.status(201).json({
    message: 'Product created successfully.',
    product,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const existing = await Product.findById(req.params.id);

  if (!existing) {
    throw httpError(404, 'Product not found.');
  }

  const payload = buildProductPayload({ ...existing.toObject(), ...req.body });
  Object.assign(existing, payload);

  const product = await existing.save();

  return res.status(200).json({
    message: 'Product updated successfully.',
    product,
  });
});
