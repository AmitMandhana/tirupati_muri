import {
  createParty,
  getPartyDetail,
  listParties,
  listReceivables,
  receivePartyPayment,
  updateParty,
} from '../services/partyService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getParties = asyncHandler(async (req, res) => {
  const result = await listParties(req.query);

  return res.status(200).json(result);
});

export const addParty = asyncHandler(async (req, res) => {
  const party = await createParty(req.body);

  return res.status(201).json({
    message: 'Party created.',
    party,
  });
});

export const getParty = asyncHandler(async (req, res) => {
  const result = await getPartyDetail(req.params.id);

  return res.status(200).json(result);
});

export const editParty = asyncHandler(async (req, res) => {
  const party = await updateParty(req.params.id, req.body);

  return res.status(200).json({
    message: 'Party updated.',
    party,
  });
});

export const getReceivables = asyncHandler(async (req, res) => {
  const result = await listReceivables(req.query);

  return res.status(200).json(result);
});

export const addPartyPayment = asyncHandler(async (req, res) => {
  const { payment, outstanding } = await receivePartyPayment(req.params.id, req.body);

  return res.status(201).json({
    message: 'Payment recorded.',
    payment,
    outstanding,
  });
});
