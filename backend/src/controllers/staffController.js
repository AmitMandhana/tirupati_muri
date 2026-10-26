import {
  createStaff,
  createStaffTransaction,
  getStaffDetail,
  getStaffSummary,
  listStaff,
  updateStaff,
} from '../services/staffService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStaff = asyncHandler(async (req, res) => {
  const result = await listStaff(req.query);

  return res.status(200).json(result);
});

export const addStaff = asyncHandler(async (req, res) => {
  const staff = await createStaff(req.body);

  return res.status(201).json({
    message: 'Staff member added.',
    staff,
  });
});

export const getStaffSummaryHandler = asyncHandler(async (req, res) => {
  const result = await getStaffSummary();

  return res.status(200).json(result);
});

export const getStaffMember = asyncHandler(async (req, res) => {
  const result = await getStaffDetail(req.params.id);

  return res.status(200).json(result);
});

export const editStaff = asyncHandler(async (req, res) => {
  const staff = await updateStaff(req.params.id, req.body);

  return res.status(200).json({
    message: 'Staff member updated.',
    staff,
  });
});

export const addStaffTransactionHandler = asyncHandler(async (req, res) => {
  const result = await createStaffTransaction(req.params.id, req.body);

  return res.status(201).json({
    message: 'Staff transaction recorded.',
    ...result,
  });
});
