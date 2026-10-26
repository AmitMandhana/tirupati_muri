export const INVOICE_STATUS_META = {
  paid: {
    label: 'Paid',
    pillClass: 'bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  partial: {
    label: 'Partially Paid',
    pillClass: 'bg-amber-50 text-amber-700',
    dotClass: 'bg-amber-500',
  },
  credit: {
    label: 'Credit',
    pillClass: 'bg-red-50 text-red-700',
    dotClass: 'bg-red-500',
  },
};

export const getInvoiceStatusMeta = (status) =>
  INVOICE_STATUS_META[status] ?? {
    label: status || 'Unknown',
    pillClass: 'bg-cream-100 text-ink-500',
    dotClass: 'bg-ink-400',
  };

export const getInvoiceStatus = (total, paid) => {
  const totalValue = Number(total) || 0;
  const paidValue = Number(paid) || 0;

  if (paidValue >= totalValue - 0.005) {
    return 'paid';
  }

  return paidValue > 0 ? 'partial' : 'credit';
};
