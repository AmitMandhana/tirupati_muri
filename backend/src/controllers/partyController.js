import { Party } from '../models/Party.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegExp, isValidPhone, toText } from '../utils/validators.js';

export const listParties = asyncHandler(async (req, res) => {
  const search = toText(req.query.search);
  const filters = {};

  if (search) {
    const pattern = new RegExp(escapeRegExp(search), 'i');
    filters.$or = [{ name: pattern }, { phone: pattern }];
  }

  const parties = await Party.find(filters).sort({ name: 1, _id: 1 }).limit(200).lean();

  return res.status(200).json({ parties });
});

export const createParty = asyncHandler(async (req, res) => {
  const name = toText(req.body.name);
  const phone = toText(req.body.phone);
  const address = toText(req.body.address);

  if (!name) {
    throw httpError(400, 'Party name is required.');
  }

  if (name.length > 150) {
    throw httpError(400, 'Party name cannot be longer than 150 characters.');
  }

  if (!phone) {
    throw httpError(400, 'Party phone is required.');
  }

  if (phone.length > 20 || !isValidPhone(phone)) {
    throw httpError(400, 'Enter a valid party phone number.');
  }

  if (address.length > 300) {
    throw httpError(400, 'Address cannot be longer than 300 characters.');
  }

  const party = await Party.create({ name, phone, address });

  return res.status(201).json({
    message: 'Party created.',
    party,
  });
});
