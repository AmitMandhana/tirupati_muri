import mongoose from 'mongoose';

import { Party } from '../models/Party.js';
import { PartyPayment, PARTY_PAYMENT_ACCOUNTS, PARTY_PAYMENT_METHODS } from '../models/PartyPayment.js';
import { WholesaleInvoice } from '../models/WholesaleInvoice.js';
import { getNextPartyPaymentNumber } from './billNumberService.js';
import { httpError } from '../utils/httpError.js';
import { escapeRegExp, isValidPhone, toText } from '../utils/validators.js';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENT_METHOD_LABELS = { cash: 'Cash', upi: 'UPI', bank: 'Bank' };
const ACCOUNT_LABELS = { cash: 'Cash', bank: 'Bank' };

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const roundMoney = (value) => roundTo(value, 2);

const parseMoney = (value, label, { required = false } = {}) => {
  const text = String(value ?? '').trim();

  if (!text) {
    if (required) {
      throw httpError(400, `${label} is required.`);
    }

    return 0;
  }

  const amount = Number(text);

  if (!Number.isFinite(amount) || amount < 0) {
    throw httpError(400, `${label} must be a number of 0 or more.`);
  }

  return roundMoney(amount);
};

const parseNotes = (value) => {
  const notes = toText(value);

  if (notes.length > 500) {
    throw httpError(400, 'Notes cannot be longer than 500 characters.');
  }

  return notes;
};

const parseActive = (value, fallback = true) => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === 'false') {
    return value === 'true';
  }

  throw httpError(400, 'Active status must be true or false.');
};

const parsePaymentDate = (value) => {
  const text = toText(value);

  if (!text) {
    throw httpError(400, 'Payment date is required.');
  }

  const date = DATE_ONLY_PATTERN.test(text)
    ? new Date(`${text}T23:59:59.999`)
    : new Date(text);

  if (Number.isNaN(date.getTime())) {
    throw httpError(400, 'Enter a valid payment date.');
  }

  return date;
};

const toPartyView = (party) => ({
  _id: party._id,
  name: party.name,
  phone: party.phone,
  address: party.address ?? '',
  openingBalance: roundMoney(party.openingBalance ?? 0),
  creditLimit: roundMoney(party.creditLimit ?? 0),
  notes: party.notes ?? '',
  active: party.active !== false,
  createdAt: party.createdAt,
  updatedAt: party.updatedAt,
});

const resolveParty = async (partyId) => {
  if (!mongoose.isValidObjectId(partyId)) {
    throw httpError(404, 'Party not found.');
  }

  const party = await Party.findById(partyId).lean();

  if (!party) {
    throw httpError(404, 'Party not found.');
  }

  return party;
};

const validatePartyPayload = (body = {}) => {
  const name = toText(body.name);
  const phone = toText(body.phone);
  const address = toText(body.address);

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

  const openingBalance = parseMoney(body.openingBalance, 'Opening balance');
  const creditLimit = parseMoney(body.creditLimit, 'Credit limit');
  const notes = parseNotes(body.notes);
  const active = parseActive(body.active);

  return { name, phone, address, openingBalance, creditLimit, notes, active };
};

const buildPartyFilters = ({ search, active } = {}) => {
  const filters = {};
  const term = toText(search);

  if (term) {
    const pattern = new RegExp(escapeRegExp(term), 'i');
    filters.$or = [{ name: pattern }, { phone: pattern }];
  }

  const activeFilter = toText(active).toLowerCase();

  if (activeFilter === 'true') {
    filters.active = { $ne: false };
  } else if (activeFilter === 'false') {
    filters.active = false;
  }

  return filters;
};

const buildLedgerEntries = (party, invoices, payments) => {
  const entries = [];
  const openingBalance = roundMoney(party.openingBalance ?? 0);

  if (openingBalance !== 0) {
    entries.push({
      id: 'opening',
      type: 'opening',
      date: party.createdAt,
      reference: 'Opening',
      description: 'Opening balance',
      debit: openingBalance,
      credit: 0,
      meta: {},
    });
  }

  invoices.forEach((invoice) => {
    entries.push({
      id: String(invoice._id),
      type: 'invoice',
      date: invoice.createdAt,
      reference: invoice.invoiceNumber,
      description: `Wholesale invoice · ${invoice.productName}`,
      debit: roundMoney(invoice.total),
      credit: roundMoney(invoice.paid),
      meta: {
        invoiceId: String(invoice._id),
        productName: invoice.productName,
        quantity: invoice.quantity,
        unit: invoice.unit,
        rate: invoice.rate,
        due: roundMoney(invoice.due),
        status: invoice.status,
        notes: invoice.notes ?? '',
      },
    });
  });

  payments.forEach((payment) => {
    const method = PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod;
    const account = ACCOUNT_LABELS[payment.account] ?? payment.account;

    entries.push({
      id: String(payment._id),
      type: 'payment',
      date: payment.paymentDate,
      reference: payment.paymentNumber,
      description: `Payment received · ${method} (${account})`,
      debit: 0,
      credit: roundMoney(payment.amount),
      meta: {
        paymentId: String(payment._id),
        paymentMethod: payment.paymentMethod,
        account: payment.account,
        notes: payment.notes ?? '',
      },
    });
  });

  const typeOrder = { opening: 0, invoice: 1, payment: 2 };

  entries.sort((a, b) => {
    if (a.type === 'opening' || b.type === 'opening') {
      if (a.type === b.type) {
        return 0;
      }

      return a.type === 'opening' ? -1 : 1;
    }

    const dateDifference = new Date(a.date).getTime() - new Date(b.date).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }

    return String(a.id).localeCompare(String(b.id));
  });

  let runningBalance = 0;

  return entries.map((entry) => {
    runningBalance = roundMoney(runningBalance + entry.debit - entry.credit);
    return { ...entry, balance: runningBalance };
  });
};

export const listParties = async (query = {}) => {
  const filters = buildPartyFilters(query);
  const parties = await Party.find(filters).sort({ name: 1, _id: 1 }).limit(200).lean();

  return { parties: parties.map(toPartyView) };
};

export const createParty = async (body = {}) => {
  const party = await Party.create(validatePartyPayload(body));

  return toPartyView(party);
};

export const updateParty = async (partyId, body = {}) => {
  await resolveParty(partyId);
  const payload = validatePartyPayload(body);
  const party = await Party.findByIdAndUpdate(
    partyId,
    { $set: payload },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  return toPartyView(party);
};

export const getPartyOutstanding = async (party) => {
  const [invoiceRow, paymentRow] = await Promise.all([
    WholesaleInvoice.aggregate([
      { $match: { party: party._id } },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          paid: { $sum: '$paid' },
        },
      },
    ]),
    PartyPayment.aggregate([
      { $match: { party: party._id } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
  ]);

  const openingBalance = Number(party.openingBalance) || 0;
  const invoiceTotals = invoiceRow[0] ?? {};
  const paymentTotals = paymentRow[0] ?? {};

  return roundMoney(
    openingBalance +
      (invoiceTotals.total ?? 0) -
      (invoiceTotals.paid ?? 0) -
      (paymentTotals.amount ?? 0),
  );
};

export const getPartyDetail = async (partyId) => {
  const party = await resolveParty(partyId);

  const [invoices, payments] = await Promise.all([
    WholesaleInvoice.find({ party: party._id })
      .sort({ createdAt: 1, _id: 1 })
      .lean(),
    PartyPayment.find({ party: party._id })
      .sort({ paymentDate: 1, _id: 1 })
      .lean(),
  ]);

  const ledger = buildLedgerEntries(party, invoices, payments);
  const totalSales = roundMoney(invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0));
  const invoiceReceived = roundMoney(invoices.reduce((sum, invoice) => sum + (invoice.paid || 0), 0));
  const paymentReceived = roundMoney(payments.reduce((sum, payment) => sum + (payment.amount || 0), 0));
  const totalReceived = roundMoney(invoiceReceived + paymentReceived);
  const outstanding = roundMoney(
    (party.openingBalance ?? 0) + totalSales - totalReceived,
  );
  const creditLimit = roundMoney(party.creditLimit ?? 0);
  const usedCredit = Math.max(outstanding, 0);

  return {
    party: toPartyView(party),
    stats: {
      totalInvoices: invoices.length,
      totalSales,
      totalReceived,
      outstanding,
      lastInvoiceAt: invoices.length > 0 ? invoices[invoices.length - 1].createdAt : null,
      lastPaymentAt: payments.length > 0 ? payments[payments.length - 1].paymentDate : null,
    },
    credit: {
      limit: creditLimit,
      used: roundMoney(usedCredit),
      available: creditLimit > 0 ? roundMoney(Math.max(creditLimit - usedCredit, 0)) : null,
      exceeded: creditLimit > 0 && outstanding > creditLimit + 0.005,
    },
    ledger,
  };
};

export const listReceivables = async (query = {}) => {
  const filters = buildPartyFilters({ search: query.search });

  const [parties, invoiceRows, paymentRows, accountRows] = await Promise.all([
    Party.find(filters).sort({ name: 1, _id: 1 }).limit(500).lean(),
    WholesaleInvoice.aggregate([
      {
        $group: {
          _id: '$party',
          total: { $sum: '$total' },
          paid: { $sum: '$paid' },
          count: { $sum: 1 },
          lastInvoiceAt: { $max: '$createdAt' },
        },
      },
    ]),
    PartyPayment.aggregate([
      {
        $group: {
          _id: '$party',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
          lastPaymentAt: { $max: '$paymentDate' },
        },
      },
    ]),
    PartyPayment.aggregate([
      { $group: { _id: '$account', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const invoicesByParty = new Map(
    invoiceRows.map((row) => [String(row._id), row]),
  );
  const paymentsByParty = new Map(
    paymentRows.map((row) => [String(row._id), row]),
  );

  const records = parties
    .map((party) => {
      const invoiceRow = invoicesByParty.get(String(party._id)) ?? {};
      const paymentRow = paymentsByParty.get(String(party._id)) ?? {};
      const openingBalance = roundMoney(party.openingBalance ?? 0);
      const creditLimit = roundMoney(party.creditLimit ?? 0);
      const outstanding = roundMoney(
        openingBalance +
          (invoiceRow.total ?? 0) -
          (invoiceRow.paid ?? 0) -
          (paymentRow.amount ?? 0),
      );

      return {
        _id: party._id,
        name: party.name,
        phone: party.phone,
        active: party.active !== false,
        openingBalance,
        creditLimit,
        outstanding,
        invoiceCount: invoiceRow.count ?? 0,
        lastInvoiceAt: invoiceRow.lastInvoiceAt ?? null,
        lastPaymentAt: paymentRow.lastPaymentAt ?? null,
        creditLimitExceeded: creditLimit > 0 && outstanding > creditLimit + 0.005,
      };
    })
    .filter((record) => record.outstanding > 0.005)
    .sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name));

  const cashRow = accountRows.find((row) => row._id === 'cash');
  const bankRow = accountRows.find((row) => row._id === 'bank');

  return {
    parties: records,
    summary: {
      totalOutstanding: roundMoney(records.reduce((sum, record) => sum + record.outstanding, 0)),
      partyCount: records.length,
      cashReceived: roundMoney(cashRow?.amount ?? 0),
      bankReceived: roundMoney(bankRow?.amount ?? 0),
      paymentsCount: (cashRow?.count ?? 0) + (bankRow?.count ?? 0),
    },
  };
};

export const receivePartyPayment = async (partyId, body = {}) => {
  const party = await resolveParty(partyId);
  const amount = parseMoney(body.amount, 'Payment amount', { required: true });

  if (amount <= 0) {
    throw httpError(400, 'Payment amount must be greater than 0.');
  }

  const paymentMethod = toText(body.paymentMethod).toLowerCase();

  if (!PARTY_PAYMENT_METHODS.includes(paymentMethod)) {
    throw httpError(400, 'Payment method must be cash, upi or bank.');
  }

  const accountInput = toText(body.account).toLowerCase();
  const account = accountInput || (paymentMethod === 'cash' ? 'cash' : 'bank');

  if (!PARTY_PAYMENT_ACCOUNTS.includes(account)) {
    throw httpError(400, 'Cash or bank account is required.');
  }

  if (paymentMethod === 'cash' && account !== 'cash') {
    throw httpError(400, 'Cash payments must be received into the cash account.');
  }

  if (paymentMethod !== 'cash' && account !== 'bank') {
    throw httpError(400, 'UPI and bank payments must be received into the bank account.');
  }

  const paymentDate = parsePaymentDate(body.paymentDate);
  const notes = parseNotes(body.notes);
  const paymentNumber = await getNextPartyPaymentNumber();

  const payment = await PartyPayment.create({
    paymentNumber,
    party: party._id,
    partyName: party.name,
    partyPhone: party.phone,
    amount,
    paymentMethod,
    account,
    paymentDate,
    notes,
  });

  const outstanding = await getPartyOutstanding(party);

  return { payment, outstanding };
};
