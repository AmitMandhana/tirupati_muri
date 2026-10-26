import { formatINR2, formatReceiptDate } from './format';

const normalizePhone = (phone) => {
  const digits = String(phone ?? '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  let normalized = digits;

  if (normalized.length === 11 && normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }

  if (normalized.length === 10) {
    normalized = `91${normalized}`;
  }

  return normalized;
};

export const buildPaymentReminderMessage = ({
  partyName,
  outstanding,
  businessName = 'Tirupati Puffed Rice Mill',
}) =>
  `Dear ${partyName},\n\nThis is a payment reminder from ${businessName}. Your outstanding balance is ${formatINR2(outstanding)}.\n\nPlease arrange the payment at your earliest convenience.\n\nThank you,\n${businessName}`;

export const buildInvoiceMessage = ({
  partyName,
  invoiceNumber,
  invoiceDate,
  total,
  paid,
  outstanding,
  businessName = 'Tirupati Puffed Rice Mill',
}) =>
  `Dear ${partyName},\n\nInvoice from ${businessName}\nInvoice no: ${invoiceNumber}\nDate: ${formatReceiptDate(invoiceDate)}\nTotal: ${formatINR2(total)}\nPaid: ${formatINR2(paid)}\nOutstanding: ${formatINR2(outstanding)}\n\nThank you,\n${businessName}`;

export const buildLedgerMessage = ({
  partyName,
  businessName = 'Tirupati Puffed Rice Mill',
  openingBalance = 0,
  invoicesTotal = 0,
  paymentsTotal = 0,
  outstanding = 0,
  asOf = new Date(),
}) =>
  `Dear ${partyName},\n\nLedger statement from ${businessName}\nAs of: ${formatReceiptDate(asOf)}\nOpening balance: ${formatINR2(openingBalance)}\nInvoices: ${formatINR2(invoicesTotal)}\nPayments received: ${formatINR2(paymentsTotal)}\nOutstanding: ${formatINR2(outstanding)}\n\nPlease contact us if you would like a detailed statement.\n\nThank you,\n${businessName}`;

export const buildWhatsAppUrl = ({ phone, message }) => {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return '';
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};
