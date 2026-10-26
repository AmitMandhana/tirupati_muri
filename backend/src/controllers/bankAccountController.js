import {
  createBankAccount,
  createBankTransaction,
  getBankAccountDetail,
  listBankAccounts,
  transferBetweenAccounts,
  updateBankAccount,
} from '../services/bankAccountService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBankAccounts = asyncHandler(async (req, res) => {
  const result = await listBankAccounts();

  return res.status(200).json(result);
});

export const addBankAccount = asyncHandler(async (req, res) => {
  const account = await createBankAccount(req.body);

  return res.status(201).json({
    message: 'Bank account added.',
    account,
  });
});

export const getBankAccount = asyncHandler(async (req, res) => {
  const result = await getBankAccountDetail(req.params.id);

  return res.status(200).json(result);
});

export const editBankAccount = asyncHandler(async (req, res) => {
  const account = await updateBankAccount(req.params.id, req.body);

  return res.status(200).json({
    message: 'Bank account updated.',
    account,
  });
});

export const addBankTransaction = asyncHandler(async (req, res) => {
  const transaction = await createBankTransaction(req.params.id, req.body);

  return res.status(201).json({
    message: 'Bank transaction recorded.',
    transaction,
  });
});

export const transferFunds = asyncHandler(async (req, res) => {
  const transfer = await transferBetweenAccounts(req.body);

  return res.status(201).json({
    message: `Transfer ${transfer.transferNumber} recorded.`,
    transfer,
  });
});
