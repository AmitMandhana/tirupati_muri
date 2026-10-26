const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const isValidEmail = (value) => EMAIL_PATTERN.test(value.trim());

export const isValidPhone = (value) => {
  const phone = value.trim();
  if (!/^[+]?[0-9\s-]+$/.test(phone)) {
    return false;
  }

  const digitCount = phone.replace(/\D/g, '').length;
  return digitCount >= 7 && digitCount <= 15;
};

export const isValidGstNumber = (value) => GSTIN_PATTERN.test(value.trim().toUpperCase());
