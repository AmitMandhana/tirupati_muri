import {
  createWholesaleInvoice,
  getWholesaleInvoice,
  listWholesaleInvoices,
} from '../services/wholesaleInvoiceService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createInvoice = asyncHandler(async (req, res) => {
  const { invoice, stock } = await createWholesaleInvoice(req.body);

  return res.status(201).json({
    message: 'Invoice saved.',
    invoice,
    stock,
  });
});

export const listInvoices = asyncHandler(async (req, res) => {
  const result = await listWholesaleInvoices(req.query);

  return res.status(200).json(result);
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await getWholesaleInvoice(req.params.id);

  return res.status(200).json({ invoice });
});
