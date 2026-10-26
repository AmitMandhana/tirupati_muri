export const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/retail-billing', label: 'Retail Billing', icon: 'billing' },
      { to: '/wholesale', label: 'Wholesale', icon: 'wholesale' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/parties', label: 'Parties', icon: 'parties' },
      { to: '/stock', label: 'Stock', icon: 'stock' },
      { to: '/production', label: 'Production', icon: 'production' },
      { to: '/staff', label: 'Staff', icon: 'staff' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/receivables', label: 'Receivables', icon: 'loans' },
      { to: '/expenses', label: 'Expenses', icon: 'expenses' },
      { to: '/cash-book', label: 'Cash Book', icon: 'cashbook' },
      { to: '/bank-accounts', label: 'Bank Accounts', icon: 'bank' },
      { to: '/loans', label: 'Loans', icon: 'loans' },
    ],
  },
  {
    label: 'Insights',
    items: [{ to: '/reports', label: 'Reports', icon: 'reports' }],
  },
  {
    label: 'System',
    items: [
      { to: '/products', label: 'Product Management', icon: 'products' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export const getPageTitle = (pathname) => {
  if (pathname.startsWith('/parties/')) {
    return 'Party Ledger';
  }

  if (pathname.startsWith('/bank-accounts/')) {
    return 'Bank Account';
  }

  const activeItem = ALL_NAV_ITEMS.find((item) => item.to === pathname);
  return activeItem?.label ?? 'Dashboard';
};
