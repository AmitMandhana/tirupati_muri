import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';
import { AuthProvider } from './hooks/useAuth';
import { BusinessSettingsProvider } from './hooks/useBusinessSettings';
import AppLayout from './layouts/AppLayout';

const BankAccountDetailPage = lazy(() => import('./pages/BankAccountDetailPage'));
const BankAccountsPage = lazy(() => import('./pages/BankAccountsPage'));
const CashBookPage = lazy(() => import('./pages/CashBookPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const AuditTrailPage = lazy(() => import('./pages/AuditTrailPage'));
const LoansPage = lazy(() => import('./pages/LoansPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const PartiesPage = lazy(() => import('./pages/PartiesPage'));
const PartyDetailPage = lazy(() => import('./pages/PartyDetailPage'));
const ProductionPage = lazy(() => import('./pages/ProductionPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ReceivablesPage = lazy(() => import('./pages/ReceivablesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const RetailBillingPage = lazy(() => import('./pages/RetailBillingPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StaffDetailPage = lazy(() => import('./pages/StaffDetailPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const WholesalePage = lazy(() => import('./pages/WholesalePage'));

const RouteFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-ink-500">
    <Spinner className="h-4 w-4 text-brand-600" />
    Loading...
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#2b2117',
              color: '#f2e9db',
              fontSize: '13.5px',
              borderRadius: '10px',
              padding: '10px 14px',
            },
            success: {
              iconTheme: { primary: '#f5d1a1', secondary: '#2b2117' },
            },
            error: {
              iconTheme: { primary: '#fca5a5', secondary: '#2b2117' },
            },
          }}
        />

        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <BusinessSettingsProvider>
                    <AppLayout />
                  </BusinessSettingsProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="retail-billing" element={<RetailBillingPage />} />
              <Route path="wholesale" element={<WholesalePage />} />
              <Route path="parties" element={<PartiesPage />} />
              <Route path="parties/:id" element={<PartyDetailPage />} />
              <Route path="receivables" element={<ReceivablesPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="production" element={<ProductionPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="staff/:id" element={<StaffDetailPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="cash-book" element={<CashBookPage />} />
              <Route path="bank-accounts" element={<BankAccountsPage />} />
              <Route path="bank-accounts/:id" element={<BankAccountDetailPage />} />
              <Route path="loans" element={<LoansPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit-trail" element={<AuditTrailPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
