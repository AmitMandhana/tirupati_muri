import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import ConfirmDialog from '../components/ConfirmDialog';
import NavIcon from '../components/NavIcon';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { formatLongDate, getInitials } from '../utils/format';
import { getPageTitle } from '../utils/navigation';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const { settings } = useBusinessSettings();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const pageTitle = getPageTitle(location.pathname);
  const today = formatLongDate(new Date());

  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

  const handleConfirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    toast.success('Logged out successfully.');
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="flex min-h-screen">
        <div className="sticky top-0 hidden h-screen w-72 shrink-0 lg:block">
          <Sidebar
            onNavigate={closeSidebar}
            onLogoutClick={() => setIsLogoutDialogOpen(true)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-cream-200 bg-cream-50/90 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="rounded-lg border border-cream-300 bg-white p-2 text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 lg:hidden"
                aria-label="Open navigation menu"
              >
                <NavIcon name="menu" className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900 sm:text-base">
                  {pageTitle}
                </p>
                <p className="truncate text-[11px] text-ink-500">{settings.businessName}</p>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <p className="hidden text-xs text-ink-500 md:block">{today}</p>
                <div className="flex items-center gap-2 rounded-full border border-cream-200 bg-white py-1 pl-1 pr-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                    {getInitials(user?.name)}
                  </span>
                  <span className="hidden max-w-[150px] truncate text-xs font-semibold text-ink-700 sm:block">
                    {user?.name}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1440px]">
              <Outlet />
            </div>
          </main>

          <footer className="border-t border-cream-200 px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-center text-[11px] text-ink-400">
              {settings.businessName} &middot; Business Management System
            </p>
          </footer>
        </div>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-900/50"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl"
          >
            <Sidebar
              onNavigate={closeSidebar}
              onLogoutClick={() => {
                closeSidebar();
                setIsLogoutDialogOpen(true);
              }}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        title="Logout from the application?"
        message="You will need to sign in again to access the dashboard and business records."
        confirmText="Logout"
        variant="danger"
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default AppLayout;
