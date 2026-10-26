const icons = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  billing: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </>
  ),
  wholesale: (
    <>
      <path d="M3 7h10v9H3z" />
      <path d="M13 10h4.5l3.5 3.5V16h-8" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  parties: (
    <>
      <path d="M15.5 19.5v-1.2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v1.2" />
      <circle cx="9.5" cy="7.5" r="3.2" />
      <path d="M17 11a3 3 0 1 0-1.8-5.4" />
      <path d="M21 19.5v-1.2a4 4 0 0 0-3-3.9" />
    </>
  ),
  stock: (
    <>
      <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7Z" />
      <path d="M3 8.5 12 14l9-5.5M12 14v7" />
    </>
  ),
  production: (
    <>
      <path d="M3.5 21V9l5 3V9l5 3V9l5 3v9h-15Z" />
      <path d="M8 21v-4h4v4" />
      <path d="M18.5 6.5V3" />
    </>
  ),
  staff: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1" />
    </>
  ),
  expenses: (
    <>
      <path d="M12 3v10m0 0 4-4m-4 4-4-4" />
      <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
    </>
  ),
  cashbook: (
    <>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 0 5 22V4.5Z" />
      <path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H19" />
      <path d="M9 6.5h6" />
    </>
  ),
  bank: (
    <>
      <path d="m3 9 9-5 9 5" />
      <path d="M5.5 9.5v8M9.8 9.5v8M14.2 9.5v8M18.5 9.5v8" />
      <path d="M3 20.5h18" />
    </>
  ),
  loans: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 8h7M8.5 11h7" />
      <path d="M15.5 8c0 2.7-1.9 4.4-4.6 4.4H8.5l6 5.6" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7" />
      <path d="M2.5 20.5h19" />
    </>
  ),
  products: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3.5 13.5V3.5h10l7.1 7.1a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M18.5 7H21M4 17h3M12.5 17H21" />
      <circle cx="15.5" cy="7" r="2.4" />
      <circle cx="9.5" cy="17" r="2.4" />
    </>
  ),
  logout: (
    <>
      <path d="M10 20H6.5A2.5 2.5 0 0 1 4 17.5v-11A2.5 2.5 0 0 1 6.5 4H10" />
      <path d="M16 8l4 4-4 4M20 12H9.5" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  check: (
    <>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20.5v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v11m0 0 4.5-4.5M12 14 7.5 9.5" />
      <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
    </>
  ),
  audit: (
    <>
      <path d="M6 3h9l4 4v14H6a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 6 3Z" />
      <path d="M14.5 3v4.5H19" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
};

const NavIcon = ({ name, className = 'h-[18px] w-[18px]' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {icons[name] ?? icons.dashboard}
  </svg>
);

export default NavIcon;
