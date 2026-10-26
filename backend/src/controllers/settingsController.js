import { BusinessSettings } from '../models/BusinessSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import {
  isValidEmail,
  isValidGstNumber,
  isValidPhone,
  toText,
} from '../utils/validators.js';

const DEFAULT_SETTINGS = {
  businessName: 'Tirupati Puffed Rice Mill',
  address: '',
  phone: '',
  email: '',
  gstNumber: '',
  ownerName: '',
  receiptFooter: '',
  invoiceFooter: '',
  retailMuriRate: 45,
  wholesaleMuriRate: 42,
  bagWeightKg: 50,
  lowStockThresholdKg: 100,
  cashOpeningBalance: 0,
  cashOpeningDate: null,
};

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await BusinessSettings.findOne().lean();

  if (!settings) {
    return res.status(200).json({ settings: DEFAULT_SETTINGS });
  }

  return res.status(200).json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const payload = {
    businessName: toText(req.body.businessName),
    address: toText(req.body.address),
    phone: toText(req.body.phone),
    email: toText(req.body.email).toLowerCase(),
    gstNumber: toText(req.body.gstNumber).toUpperCase(),
    ownerName: toText(req.body.ownerName),
    receiptFooter: toText(req.body.receiptFooter),
    invoiceFooter: toText(req.body.invoiceFooter),
    retailMuriRate: Number(req.body.retailMuriRate),
    wholesaleMuriRate: Number(req.body.wholesaleMuriRate),
    bagWeightKg: Number(req.body.bagWeightKg),
    lowStockThresholdKg: Number(req.body.lowStockThresholdKg),
  };

  if (!payload.businessName) {
    throw httpError(400, 'Business name is required.');
  }

  if (payload.businessName.length > 150) {
    throw httpError(400, 'Business name cannot be longer than 150 characters.');
  }

  if (payload.ownerName.length > 100) {
    throw httpError(400, 'Owner name cannot be longer than 100 characters.');
  }

  if (payload.address.length > 500) {
    throw httpError(400, 'Address cannot be longer than 500 characters.');
  }

  if (payload.email && !isValidEmail(payload.email)) {
    throw httpError(400, 'Please enter a valid email address.');
  }

  if (payload.phone && !isValidPhone(payload.phone)) {
    throw httpError(400, 'Please enter a valid phone number.');
  }

  if (payload.gstNumber && !isValidGstNumber(payload.gstNumber)) {
    throw httpError(400, 'Please enter a valid 15 character GST number.');
  }

  if (payload.receiptFooter.length > 500) {
    throw httpError(400, 'Receipt footer cannot be longer than 500 characters.');
  }

  if (payload.invoiceFooter.length > 500) {
    throw httpError(400, 'Invoice footer cannot be longer than 500 characters.');
  }

  if (!Number.isFinite(payload.retailMuriRate) || payload.retailMuriRate < 0) {
    throw httpError(400, 'Retail muri rate must be a number of 0 or more.');
  }

  if (!Number.isFinite(payload.wholesaleMuriRate) || payload.wholesaleMuriRate < 0) {
    throw httpError(400, 'Wholesale muri rate must be a number of 0 or more.');
  }

  if (!Number.isFinite(payload.bagWeightKg) || payload.bagWeightKg <= 0) {
    throw httpError(400, 'Bag weight must be greater than 0.');
  }

  if (!Number.isFinite(payload.lowStockThresholdKg) || payload.lowStockThresholdKg < 0) {
    throw httpError(400, 'Low-stock threshold must be a number of 0 or more.');
  }

  const settings = await BusinessSettings.findOneAndUpdate(
    {},
    { $set: payload },
    {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  return res.status(200).json({
    message: 'Settings saved successfully.',
    settings,
  });
});
