const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatINR = (value) => {
  const amount = Number(value);
  return inrFormatter.format(Number.isFinite(amount) ? amount : 0);
};

const rateFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatRate = (value) => {
  const amount = Number(value);
  return rateFormatter.format(Number.isFinite(amount) ? amount : 0);
};

const currency2Formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatINR2 = (value) => {
  const amount = Number(value);
  return currency2Formatter.format(Number.isFinite(amount) ? amount : 0);
};

const quantityFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatQuantity = (value) => {
  const quantity = Number(value);
  return quantityFormatter.format(Number.isFinite(quantity) ? quantity : 0);
};

const longDateFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const formatLongDate = (date = new Date()) => longDateFormatter.format(date);

export const toDateInputValue = (date = new Date()) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const addDaysToDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

export const formatDateKeyLong = (dateKey) =>
  formatLongDate(new Date(`${dateKey}T12:00:00`));

const receiptDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const receiptTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const toDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatReceiptDate = (value) => {
  const date = toDate(value);
  return date ? receiptDateFormatter.format(date) : '';
};

export const formatReceiptTime = (value) => {
  const date = toDate(value);
  return date ? receiptTimeFormatter.format(date) : '';
};

export const getInitials = (name = '') => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'U';
};
