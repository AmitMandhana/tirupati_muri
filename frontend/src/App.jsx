import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import { BusinessSettingsProvider } from './hooks/useBusinessSettings';
import AppLayout from './layouts/AppLayout';
import BankAccountsPage from './pages/BankAccountsPage';
import CashBookPage from './pages/CashBookPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import LoansPage from './pages/LoansPage';
import LoginPage from './pages/LoginPage';
import PartiesPage from './pages/PartiesPage';
import PartyDetailPage from './pages/PartyDetailPage';
import ProductionPage from './pages/ProductionPage';
import ProductsPage from './pages/ProductsPage';
import ReceivablesPage from './pages/ReceivablesPage';
import ReportsPage from './pages/ReportsPage';
import RetailBillingPage from './pages/RetailBillingPage';
import SettingsPage from './pages/SettingsPage';
import StaffPage from './pages/StaffPage';
import StockPage from './pages/StockPage';
import WholesalePage from './pages/WholesalePage';

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
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="cash-book" element={<CashBookPage />} />
            <Route path="bank-accounts" element={<BankAccountsPage />} />
            <Route path="loans" element={<LoansPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
