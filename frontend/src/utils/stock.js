export const STOCK_TYPE_LABELS = {
  opening: 'Opening Stock',
  production: 'Production',
  retailSale: 'Retail Sale',
  wholesaleSale: 'Wholesale Sale',
  wastage: 'Wastage',
  adjustment: 'Adjustment',
  purchase: 'Purchase / Stock Addition',
};

export const STOCK_TYPE_STYLES = {
  opening: 'bg-brand-50 text-brand-700',
  production: 'bg-sky-50 text-sky-700',
  retailSale: 'bg-cream-100 text-ink-700',
  wholesaleSale: 'bg-cream-100 text-ink-700',
  wastage: 'bg-red-50 text-red-700',
  adjustment: 'bg-amber-50 text-amber-700',
  purchase: 'bg-emerald-50 text-emerald-700',
};

export const getStockTypeLabel = (type) => STOCK_TYPE_LABELS[type] ?? type;
