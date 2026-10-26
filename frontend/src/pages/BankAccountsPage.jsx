import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import BankAccountFormDialog from '../components/BankAccountFormDialog';
import BankTransferDialog from '../components/BankTransferDialog';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { getBankAccountsApi } from '../services/bankAccountService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2 } from '../utils/format';

const BankAccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getBankAccountsApi()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setSummary(data.summary ?? null);
        setLoadError('');
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load bank accounts.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshToken]);

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshToken((token) => token + 1);
  };

  const activeAccounts = accounts.filter((account) => account.active);
  const accountCount = summary?.accountCount ?? accounts.length;
  const activeCount = summary?.activeCount ?? activeAccounts.length;

  const handleAccountSaved = () => {
    setIsFormOpen(false);
    refresh();
  };

  const handleTransferSaved = () => {
    setIsTransferOpen(false);
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="Bank Accounts"
        description="Track every bank account, its running balance and each deposit, withdrawal, receipt and transfer. Account numbers are masked for safety."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsTransferOpen(true)}
              disabled={activeCount < 2}
              title={
                activeCount < 2 ? 'Add at least two active bank accounts to transfer funds' : undefined
              }
            >
              Transfer
            </button>
            <button type="button" className="btn-primary" onClick={() => setIsFormOpen(true)}>
              Add account
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total bank balance"
          icon="bank"
          value={summary ? summary.totalBalance : null}
          formatValue={formatINR2}
          hint={
            accountCount > 0
              ? `Across ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'}`
              : 'No bank accounts yet'
          }
        />
        <StatCard
          title="Active accounts"
          icon="cashbook"
          value={summary ? activeCount : null}
          formatValue={(value) => String(value)}
          hint={
            accountCount > 0
              ? `${accountCount - activeCount} inactive`
              : 'Add your first bank account'
          }
        />
        <StatCard
          title="Today's inflow"
          icon="expenses"
          value={summary ? summary.todayInflow : null}
          formatValue={formatINR2}
          hint="Deposits and receipts today"
        />
        <StatCard
          title="Today's outflow"
          icon="loans"
          value={summary ? summary.todayOutflow : null}
          formatValue={formatINR2}
          hint="Withdrawals and payments today"
        />
      </div>

      <section className="card mt-4 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-16 text-sm text-ink-500">
            <Spinner className="h-4 w-4 text-brand-600" />
            Loading bank accounts...
          </div>
        ) : loadError ? (
          <div className="px-5 py-10">
            <h2 className="text-base font-semibold text-ink-900">Bank accounts could not be loaded</h2>
            <p className="mt-1 text-sm text-ink-500">{loadError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="bank" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink-900">No bank accounts yet</h2>
            <p className="mt-1 max-w-md text-sm text-ink-500">
              Add the mill&apos;s current and savings accounts with their opening balances. Bank
              expenses, wholesale receipts and party payments will then update these balances.
            </p>
            <button type="button" className="btn-primary mt-5" onClick={() => setIsFormOpen(true)}>
              Add bank account
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => (
                <Link
                  key={account._id}
                  to={`/bank-accounts/${account._id}`}
                  className="group flex flex-col rounded-xl border border-cream-200 bg-white p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <NavIcon name="bank" className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {account.bankName}
                        </p>
                        <p className="truncate text-xs text-ink-500">{account.accountName}</p>
                        <p className="mt-0.5 font-mono text-[11px] tracking-wide text-ink-400">
                          {account.maskedAccountNumber}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`pill ${
                        account.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-cream-100 text-ink-500'
                      }`}
                    >
                      {account.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                      Current balance
                    </p>
                    <p
                      className={`mt-1 text-xl font-semibold tracking-tight ${
                        account.balance < 0 ? 'text-red-700' : 'text-ink-900'
                      }`}
                    >
                      {formatINR2(account.balance)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-cream-200 pt-3 text-xs">
                    <div>
                      <p className="text-ink-400">Inflow today</p>
                      <p className="mt-0.5 font-semibold text-emerald-700">
                        {formatINR2(account.todayInflow)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-400">Outflow today</p>
                      <p className="mt-0.5 font-semibold text-red-700">
                        {formatINR2(account.todayOutflow)}
                      </p>
                    </div>
                  </div>

                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 group-hover:text-brand-600">
                    View ledger
                    <NavIcon name="arrowRight" className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-ink-400">
              Balances are calculated as opening balance plus inflows minus outflows. Transfers
              between two accounts leave the total business money unchanged.
            </p>
          </div>
        )}
      </section>

      {isFormOpen ? (
        <BankAccountFormDialog
          onClose={() => setIsFormOpen(false)}
          onSaved={handleAccountSaved}
        />
      ) : null}

      {isTransferOpen ? (
        <BankTransferDialog
          accounts={accounts}
          onClose={() => setIsTransferOpen(false)}
          onSaved={handleTransferSaved}
        />
      ) : null}
    </div>
  );
};

export default BankAccountsPage;
