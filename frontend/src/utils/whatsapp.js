import { formatINR2 } from './format';

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

export const buildWhatsAppUrl = ({ phone, message }) => {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return '';
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};
