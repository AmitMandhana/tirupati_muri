const Logo = ({ className = 'h-10 w-10' }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-sidebar-800 ring-1 ring-white/10 ${className}`}
  >
    <svg viewBox="0 0 32 32" className="h-[72%] w-[72%]" aria-hidden="true">
      <path d="M6 18h20c0 5.6-4.5 9-10 9S6 23.6 6 18Z" fill="#a85a10" />
      <path d="M5 18h22" stroke="#f5d1a1" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="12" cy="14" rx="4.2" ry="1.8" transform="rotate(-22 12 14)" fill="#f2e9db" />
      <ellipse cx="21" cy="13" rx="4.2" ry="1.8" transform="rotate(22 21 13)" fill="#f2e9db" />
      <ellipse cx="16.5" cy="16.2" rx="4.2" ry="1.8" fill="#f5d1a1" />
    </svg>
  </span>
);

export default Logo;
