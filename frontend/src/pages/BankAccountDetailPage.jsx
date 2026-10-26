import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import BankAccountFormDialog from '../components/BankAccountFormDialog';
import BankTransactionDialog from '../components/BankTransactionDialog';
import BankTransferDialog from '../components/BankTransferDialog';
import CancelTransactionDialog from '../components/CancelTransactionDialog';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { cancelBankTransactionApi } from '../services/cancelService';
import { getBankAccountApi, getBankAccountsApi } from '../services/bankAccountService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, formatReceiptDate } from '../utils/format';
import { downloadLedgerPdf } from '../utils/ledgerPdf';

const TYPE_LABELS = {
  opening: 'Opening',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  'sales-collection': 'Sales collection',
  'party-payment': 'Party payment',
  expense: 'Expense',
  'loan-receipt': 'Loan receipt',
  'loan-repayment': 'Loan repayment',
  'staff-payment': 'Staff payment',
  transfer: 'Transfer',
  other: 'Other',
};

const TYPE_PILL_CLASSES = {
  opening: 'bg-cream-100 text-ink-600',
  deposit: 'bg-emerald-50 text-emerald-700',
  'sales-collection': 'bg-emerald-50 text-emerald-700',
  'party-payment': 'bg-emerald-50 text-emerald-700',
  'loan-receipt': 'bg-emerald-50 text-emerald-700',
  withdrawal: 'bg-red-50 text-red-700',
  expense: 'bg-red-50 text-red-700',
  'loan-repayment': 'bg-red-50 text-red-700',
  'staff-payment': 'bg-red-50 text-red-700',
  transfer: 'bg-brand-50 text-brand-700',
  other: 'bg-cream-100 text-ink-600',
};

const isManualBankEntry = (entry) =>
  entry.type !== 'opening' &&
  (String(entry.reference ?? '').startsWith('BTX-') || entry.type === 'transfer');

const BankAccountDetailPage = () => {
  const { id } = useParams();
  const { settings } = useBusinessSettings();

  const [detail, setDetail] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getBankAccountApi(id)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setDetail(data);
        setLoadError('');
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load the bank account.'));
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
  }, [id, refreshToken]);

  useEffect(() => {
    let isMounted = true;

    getBankAccountsApi()
      .then((data) => {
        if (isMounted) {
          setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAccounts([]);
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

  if (isLoading && !detail) {
    return (
      <div className="card flex items-center justify-center gap-3 px-6 py-20 text-sm text-ink-500">
        <Spinner className="h-4 w-4 text-brand-600" />
        Loading bank account...
      </div>
    );
  }

  if (loadError && !detail) {
    return (
      <div className="card px-6 py-12">
        <h1 className="text-base font-semibold text-ink-900">Bank account could not be loaded</h1>
        <p className="mt-1 text-sm text-ink-500">{loadError}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={refresh}>
            Try again
          </button>
          <Link to="/bank-accounts" className="btn-secondary">
            Back to bank accounts
          </Link>
        </div>
      </div>
    );
  }

  const { account, summary, ledger } = detail;
  const activeAccounts = accounts.filter((item) => item.active);
  const canTransfer = account.active && activeAccounts.length >= 2;

  const handleSaved = () => {
    setIsTransactionOpen(false);
    setIsTransferOpen(false);
    setIsEditOpen(false);
    refresh();
  };

  const handleCancelTransaction = async (reason) => {
    if (!cancelTarget) {
      return;
    }

    setIsCancelling(true);

    try {
      const data = await cancelBankTransactionApi(id, cancelTarget.id, reason);
      toast.success(data.message ?? 'Bank transaction cancelled.');
      setCancelTarget(null);
      refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to cancel the bank transaction.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadLedger = async () => {
    try {
      await downloadLedgerPdf({
        title: 'Bank Ledger',
        entityName: `${account.bankName} · ${account.accountName}`,
        entityMeta: [account.maskedAccountNumber],
        summary: [
          { label: 'Opening balance', value: summary.openingBalance },
          { label: 'Inflow', value: summary.inflow },
          { label: 'Outflow', value: summary.outflow },
          { label: 'Closing balance', value: summary.balance },
        ],
        rows: ledger.map((entry) => ({
          date: entry.date,
          reference: entry.reference,
          description: entry.description,
          debit: entry.in,
          credit: entry.out,
          balance: entry.balance,
        })),
        settings,
        filename: `bank-ledger-${account.bankName.replace(/[^\w-]+/g, '-')}.pdf`,
      });
      toast.success('Bank ledger PDF downloaded.');
    } catch {
      toast.error('Unable to generate the bank ledger PDF.');
    }
  };

  return (
    <div>
      <Link
        to="/bank-accounts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
      >
        <NavIcon name="arrowRight" className="h-4 w-4 rotate-180" />
        All bank accounts
      </Link>

      <PageHeader
        title={account.bankName}
        description={`${account.accountName} · ${account.maskedAccountNumber}`}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownloadLedger}
            >
              Ledger PDF
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsTransferOpen(true)}
              disabled={!canTransfer}
              title={!canTransfer ? 'Requires an active account and at least two active accounts' : undefined}
            >
              Transfer
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditOpen(true)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsTransactionOpen(true)}
              disabled={!account.active}
              title={!account.active ? 'Reactivate this account to record transactions' : undefined}
            >
              Record transaction
            </button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`pill ${
            account.active ? 'bg-emerald-50 text-emerald-700' : 'bg-cream-100 text-ink-500'
          }`}
        >
          {account.active ? 'Active' : 'Inactive'}
        </span>
        {!account.active ? (
          <span className="text-xs text-ink-500">
            This account is inactive. Reactivate it from Edit to record new transactions.
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Current balance"
          icon="bank"
          value={summary.balance}
          formatValue={formatINR2}
          hint={`Opening balance ${formatINR2(summary.openingBalance)}`}
        />
        <StatCard
          title="Today's inflow"
          icon="expenses"
          value={summary.todayInflow}
          formatValue={formatINR2}
          hint="Money received today"
        />
        <StatCard
          title="Today's outflow"
          icon="loans"
          value={summary.todayOutflow}
          formatValue={formatINR2}
          hint="Money paid today"
        />
        <StatCard
          title="Transactions"
          icon="reports"
          value={summary.transactionCount}
          formatValue={(value) => String(value)}
          hint={
            summary.lastTransactionAt
              ? `Last on ${formatReceiptDate(summary.lastTransactionAt)}`
              : 'No transactions yet'
          }
        />
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-cream-200 bg-cream-50/60 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Transaction ledger</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Every entry is listed with a running balance for this account.
            </p>
          </div>
          <p className="text-xs text-ink-400">
            Total in {formatINR2(summary.inflow)} · out {formatINR2(summary.outflow)}
          </p>
        </div>

        {ledger.length <= 1 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="bank" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink-900">No transactions yet</h3>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              The ledger starts with the opening balance. Record a deposit, withdrawal or receipt
              to see the running balance.
            </p>
            {account.active ? (
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => setIsTransactionOpen(true)}
              >
                Record transaction
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                <tr className="border-b border-cream-200">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Reference
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Description
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    In
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Out
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Balance
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {ledger.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                      {entry.type === 'opening' ? '—' : formatReceiptDate(entry.date)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-ink-900">
                      {entry.reference}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className={`pill ${TYPE_PILL_CLASSES[entry.type] ?? 'bg-cream-100 text-ink-600'}`}>
                        {TYPE_LABELS[entry.type] ?? entry.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="max-w-[360px] font-medium text-ink-900">{entry.description}</p>
                      {entry.transferAccount ? (
                        <p className="mt-0.5 text-xs text-ink-400">{entry.transferAccount.label}</p>
                      ) : null}
                      {entry.notes ? (
                        <p className="mt-0.5 max-w-[360px] truncate text-xs text-ink-400">
                          {entry.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-emerald-700">
                      {entry.in > 0 ? formatINR2(entry.in) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-red-700">
                      {entry.out > 0 ? formatINR2(entry.out) : '—'}
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${
                        entry.balance < 0 ? 'text-red-700' : 'text-ink-900'
                      }`}
                    >
                      {formatINR2(entry.balance)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      {isManualBankEntry(entry) ? (
                        <button
                          type="button"
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                          onClick={() => setCancelTarget(entry)}
                        >
                          Cancel
                        </button>
                      ) : (
                        <span
                          className="text-ink-400"
                          title="This entry was created by another record. Cancel it from that record instead."
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isTransactionOpen ? (
        <BankTransactionDialog
          account={account}
          onClose={() => setIsTransactionOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {isTransferOpen ? (
        <BankTransferDialog
          accounts={accounts}
          defaultFromId={account._id}
          onClose={() => setIsTransferOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {isEditOpen ? (
        <BankAccountFormDialog
          account={account}
          onClose={() => setIsEditOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {cancelTarget ? (
        <CancelTransactionDialog
          title={`Cancel ${TYPE_LABELS[cancelTarget.type] ?? cancelTarget.type} ${cancelTarget.reference}?`}
          description={
            cancelTarget.type === 'transfer'
              ? `${formatINR2(cancelTarget.in > 0 ? cancelTarget.in : cancelTarget.out)} will be reversed on both bank accounts in this transfer and the entry will be marked CANCELLED in the audit trail. This cannot be undone.`
              : `${formatINR2(cancelTarget.in > 0 ? cancelTarget.in : cancelTarget.out)} will be removed from this bank ledger and the entry will be marked CANCELLED in the audit trail. This cannot be undone.`
          }
          confirmText="Cancel transaction"
          isSaving={isCancelling}
          onConfirm={handleCancelTransaction}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </div>
  );
};

export default BankAccountDetailPage;
