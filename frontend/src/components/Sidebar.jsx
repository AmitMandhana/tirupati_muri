import { NavLink } from 'react-router-dom';

import Logo from './Logo';
import NavIcon from './NavIcon';
import { useAuth } from '../hooks/useAuth';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { getInitials } from '../utils/format';
import { NAV_SECTIONS } from '../utils/navigation';

const Sidebar = ({ onNavigate, onLogoutClick }) => {
  const { user } = useAuth();
  const { settings } = useBusinessSettings();

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar-900 text-sidebar-text">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo className="h-10 w-10" />
        <div className="min-w-0">
          <p
            className="truncate text-sm font-semibold tracking-wide text-white"
            title={settings.businessName}
          >
            {settings.businessName}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-sidebar-muted">
            Management System
          </p>
        </div>
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mt-3 first:mt-1">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted/70">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-sidebar-muted hover:bg-sidebar-800 hover:text-white'
                      }`
                    }
                  >
                    <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-800 text-xs font-semibold text-brand-200">
            {getInitials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? 'User'}</p>
            <p className="truncate text-[11px] text-sidebar-muted">{user?.email ?? ''}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogoutClick}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-sidebar-text transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
        >
          <NavIcon name="logout" className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
