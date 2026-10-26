import { httpError } from './httpError.js';
import { toText } from './validators.js';

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const startOfLocalDay = (date) => {
  const value = new Date(date);
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
};

export const endOfLocalDay = (date) => {
  const value = new Date(date);
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  );
};

export const addLocalDays = (date, days) => {
  const value = new Date(date);
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
};

export const toLocalDateKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseDateOnly = (value, label, { endOfDay = false } = {}) => {
  const text = toText(value);

  if (!text) {
    throw httpError(400, `${label} is required.`);
  }

  if (!DATE_ONLY_PATTERN.test(text)) {
    throw httpError(400, `${label} must use the YYYY-MM-DD format.`);
  }

  const [year, month, day] = text.split('-').map(Number);
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  if (toLocalDateKey(date) !== text) {
    throw httpError(400, `Enter a valid ${label.toLowerCase()}.`);
  }

  return date;
};

export const getTodayDateKey = () => toLocalDateKey(new Date());
