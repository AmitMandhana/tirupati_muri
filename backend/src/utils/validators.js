const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const toText = (value) => (typeof value === 'string' ? value.trim() : '');

export const isValidEmail = (value) => EMAIL_PATTERN.test(value);

export const isValidPhone = (value) => {
  if (!/^[+]?[0-9\s-]+$/.test(value)) {
    return false;
  }

  const digitCount = value.replace(/\D/g, '').length;
  return digitCount >= 7 && digitCount <= 15;
};

export const isValidGstNumber = (value) => GSTIN_PATTERN.test(value);
