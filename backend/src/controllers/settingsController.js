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
};

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await BusinessSettings.findOne().lean();

  if (!settings) {
    return res.status(200).json({ settings: DEFAULT_SETTINGS });
  }

  return res.status(200).json({ settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const payload = {
    businessName: toText(req.body.businessName),
    address: toText(req.body.address),
    phone: toText(req.body.phone),
    email: toText(req.body.email).toLowerCase(),
    gstNumber: toText(req.body.gstNumber).toUpperCase(),
    ownerName: toText(req.body.ownerName),
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

  const settings = await BusinessSettings.findOneAndUpdate(
    {},
    { $set: payload },
    {
      new: true,
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
