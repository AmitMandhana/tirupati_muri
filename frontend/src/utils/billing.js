export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
  { value: 'credit', label: 'Credit' },
];

export const getPaymentLabel = (value) =>
  PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;
