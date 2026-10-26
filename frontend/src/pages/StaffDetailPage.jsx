import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import CancelTransactionDialog from '../components/CancelTransactionDialog';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import StaffFormDialog from '../components/StaffFormDialog';
import StaffTransactionDialog from '../components/StaffTransactionDialog';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { cancelStaffTransactionApi } from '../services/cancelService';
import { getStaffMemberApi } from '../services/staffService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, formatReceiptDate } from '../utils/format';
import { downloadLedgerPdf } from '../utils/ledgerPdf';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const formatSalaryMonth = (value) => {
  const [year, month] = String(value ?? '').split('-').map(Number);

  if (!year || !month || month < 1 || month > 12) {
    return '';
  }

  return `${MONTH_NAMES[month - 1]} ${year}`;
};

const StaffDetailPage = () => {
  const { id: staffId } = useParams();
  const { settings } = useBusinessSettings();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [entryType, setEntryType] = useState('payment');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getStaffMemberApi(staffId)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setDetail(data);
        setLoadError('');
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load the staff ledger.'));
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
  }, [staffId, refreshToken]);

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshToken((token) => token + 1);
  };

  const openEntry = (type = 'payment') => {
    setEntryType(type);
    setIsEntryOpen(true);
  };

  const handleCancelEntry = async (reason) => {
    if (!cancelTarget) {
      return;
    }

    setIsCancelling(true);

    try {
      const data = await cancelStaffTransactionApi(staffId, cancelTarget.id, reason);
      toast.success(data.message ?? 'Staff entry cancelled.');
      setCancelTarget(null);
      refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to cancel the staff entry.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const backLink = (
    <Link
      to="/staff"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
    >
      <span aria-hidden="true">&larr;</span>
      Back to staff
    </Link>
  );

  const isStale = detail && String(detail.staff._id) !== String(staffId);
  const showLoading = (isLoading && !detail) || isStale;

  if (showLoading) {
    return (
      <div>
        {backLink}
        <div className="mt-4">
          <PageHeader title="Staff ledger" description="Loading the staff member and ledger..." />
        </div>
        <section className="card flex items-center justify-center gap-3 px-6 py-16 text-sm text-ink-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Loading staff member...
        </section>
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        {backLink}
        <div className="mt-4">
          <PageHeader title="Staff ledger" description="The staff member could not be loaded." />
        </div>
        <section className="card px-6 py-10">
          <h2 className="text-base font-semibold text-ink-900">Staff member not available</h2>
          <p className="mt-1 text-sm text-ink-500">{loadError}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={refresh}>
              Try again
            </button>
            <Link to="/staff" className="btn-primary">
              Back to staff
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const { staff, summary, ledger } = detail;
  const isActive = staff.status === 'active';
  const remaining = Number(summary.remainingPayable ?? 0);
  const remainingHint =
    Math.abs(remaining) < 0.005
      ? 'All dues settled'
      : remaining < 0
        ? 'Advance paid ahead of salary'
        : 'Salary payable minus deductions and payments';
  const salaryPayableHint =
    Number(summary.bonus) > 0
      ? `${formatINR2(summary.salary)} salary + ${formatINR2(summary.bonus)} bonus`
      : 'Monthly salary charged';

  const handleDownloadLedger = async () => {
    try {
      await downloadLedgerPdf({
        title: 'Staff Ledger',
        entityName: staff.name,
        entityMeta: [staff.role, staff.phone],
        summary: [
          { label: 'Salary payable', value: summary.salaryPayable },
          { label: 'Advance paid', value: summary.advancePaid },
          { label: 'Payments made', value: summary.paymentsMade },
          { label: 'Remaining payable', value: summary.remainingPayable },
        ],
        rows: ledger.map((entry) => ({
          date: entry.date,
          reference: entry.reference,
          description: `${entry.typeLabel}${entry.salaryMonth ? ` (${formatSalaryMonth(entry.salaryMonth)})` : ''} · ${entry.description}`,
          debit: entry.debit,
          credit: entry.credit,
          balance: entry.balance,
        })),
        settings,
        filename: `staff-ledger-${staff.name.replace(/[^\w-]+/g, '-')}.pdf`,
      });
      toast.success('Staff ledger PDF downloaded.');
    } catch {
      toast.error('Unable to generate the staff ledger PDF.');
    }
  };

  return (
    <div>
      {backLink}

      <div className="mt-4">
        <PageHeader
          title={staff.name}
          description={`${staff.role} · ${staff.phone}`}
          actions={
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditOpen(true)}
              >
                Edit staff
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDownloadLedger}
                disabled={ledger.length === 0}
                title={ledger.length === 0 ? 'There are no ledger entries yet.' : undefined}
              >
                Ledger PDF
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openEntry('payment')}
                disabled={!isActive}
                title={isActive ? undefined : 'Reactivate this staff member to record entries.'}
              >
                Add entry
              </button>
            </>
          }
        />
      </div>

      {loadError ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadError}
          <button type="button" className="ml-2 font-semibold underline" onClick={refresh}>
            Refresh
          </button>
        </div>
      ) : null}

      {!isActive ? (
        <div className="mb-4 rounded-lg border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-ink-700">
          This staff member is inactive. The ledger is still available, but new salary, advance and
          payment entries cannot be recorded until the member is reactivated.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Salary payable"
          icon="staff"
          value={summary.salaryPayable}
          hint={salaryPayableHint}
        />
        <StatCard
          title="Payments made"
          icon="cashbook"
          value={summary.paymentsMade}
          hint="Salary payments recorded"
        />
        <StatCard
          title="Advance"
          icon="loans"
          value={summary.advancePaid}
          hint="Paid before salary was due"
        />
        <StatCard
          title="Remaining payable"
          icon="reports"
          value={summary.remainingPayable}
          hint={remainingHint}
        />
      </div>

      <section className="card mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-900">Staff details</h2>
          <span
            className={`pill ${
              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-cream-100 text-ink-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? 'bg-emerald-500' : 'bg-ink-400'
              }`}
              aria-hidden="true"
            />
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-400">Role</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{staff.role}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Phone</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{staff.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Joining date</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {formatReceiptDate(staff.joiningDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Monthly salary</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {formatINR2(staff.monthlySalary)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Deductions</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{formatINR2(summary.deductions)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Last salary month</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {summary.lastSalaryMonth ? formatSalaryMonth(summary.lastSalaryMonth) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Entries</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{summary.entryCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Last entry</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {summary.lastTransactionAt ? formatReceiptDate(summary.lastTransactionAt) : '—'}
            </dd>
          </div>
        </dl>

        {staff.notes ? (
          <p className="mt-4 rounded-lg bg-cream-50 px-4 py-3 text-xs leading-relaxed text-ink-500">
            <span className="font-semibold text-ink-700">Notes: </span>
            {staff.notes}
          </p>
        ) : null}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <section className="card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/60 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Salary ledger</h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Salary and bonus are debits. Advance, payments, deductions and recoveries are credits.
              </p>
            </div>
            <span className="pill bg-cream-100 text-ink-500">
              {ledger.length} {ledger.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {ledger.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <h3 className="text-sm font-semibold text-ink-900">No ledger entries yet</h3>
              <p className="mt-1 text-sm text-ink-500">
                Add this month&apos;s salary or record an advance to start the ledger.
              </p>
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => openEntry('salary')}
                disabled={!isActive}
              >
                Add salary entry
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                    <tr className="border-b border-cream-200">
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Date
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Description
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Debit
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Credit
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
                          {formatReceiptDate(entry.date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-ink-900">{entry.description}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-400">
                            {entry.typeLabel} · {entry.reference}
                            {entry.salaryMonth
                              ? ` · ${formatSalaryMonth(entry.salaryMonth)}`
                              : ''}
                          </p>
                          {entry.meta?.notes ? (
                            <p className="mt-0.5 max-w-[260px] truncate text-xs text-ink-400">
                              {entry.meta.notes}
                            </p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-ink-900">
                          {entry.debit > 0 ? formatINR2(entry.debit) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-700">
                          {entry.credit > 0 ? formatINR2(entry.credit) : '—'}
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${
                            entry.balance < -0.005 ? 'text-emerald-700' : 'text-ink-900'
                          }`}
                        >
                          {formatINR2(entry.balance)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <button
                            type="button"
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                            onClick={() => setCancelTarget(entry)}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-cream-300 bg-cream-50/70">
                      <td
                        colSpan={5}
                        className="px-5 py-3 text-right text-sm font-semibold text-ink-700"
                      >
                        Remaining payable
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-base font-semibold text-ink-900">
                        {formatINR2(remaining)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400 sm:hidden">
                Swipe the table sideways to see debit, credit and balance.
              </p>
            </>
          )}
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="card p-5">
            <h2 className="text-base font-semibold text-ink-900">Salary summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Salary payable</dt>
                <dd className="font-semibold text-ink-900">{formatINR2(summary.salaryPayable)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Advance</dt>
                <dd className="font-semibold text-ink-900">{formatINR2(summary.advancePaid)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Payments made</dt>
                <dd className="font-semibold text-ink-900">{formatINR2(summary.paymentsMade)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Deductions</dt>
                <dd className="font-semibold text-ink-900">{formatINR2(summary.deductions)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-cream-200 pt-2">
                <dt className="font-semibold text-ink-900">Remaining payable</dt>
                <dd className="text-base font-semibold text-ink-900">{formatINR2(remaining)}</dd>
              </div>
            </dl>
            <div className="mt-3 rounded-lg bg-cream-50 px-3 py-2 text-xs text-ink-500">
              {formatINR2(summary.salaryPayable)} payable − {formatINR2(summary.deductions)}{' '}
              deductions − {formatINR2(summary.advancePaid)} advance −{' '}
              {formatINR2(summary.paymentsMade)} paid = {formatINR2(remaining)}
            </div>
            <button
              type="button"
              className="btn-primary mt-3 w-full"
              onClick={() => openEntry('payment')}
              disabled={!isActive}
            >
              Record payment
            </button>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-ink-900">How the ledger works</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              Salary and bonus increase what the mill owes the staff member (debit). Advance,
              payments, deductions and loan recoveries reduce it (credit). The balance is recalculated
              from every entry, so it always shows the remaining payable.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-ink-500">
              <button
                type="button"
                className="block font-semibold text-brand-700 hover:text-brand-600 disabled:opacity-50"
                onClick={() => openEntry('salary')}
                disabled={!isActive}
              >
                Add monthly salary
              </button>
              <button
                type="button"
                className="block font-semibold text-brand-700 hover:text-brand-600 disabled:opacity-50"
                onClick={() => openEntry('advance')}
                disabled={!isActive}
              >
                Record an advance
              </button>
              <button
                type="button"
                className="block font-semibold text-brand-700 hover:text-brand-600 disabled:opacity-50"
                onClick={() => openEntry('recovery')}
                disabled={!isActive}
              >
                Record a loan recovery
              </button>
            </div>
          </section>
        </aside>
      </div>

      {isEntryOpen ? (
        <StaffTransactionDialog
          staff={staff}
          defaultType={entryType}
          onClose={() => setIsEntryOpen(false)}
          onSaved={() => {
            setIsEntryOpen(false);
            refresh();
          }}
        />
      ) : null}

      {isEditOpen ? (
        <StaffFormDialog
          staff={staff}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => {
            setIsEditOpen(false);
            refresh();
          }}
        />
      ) : null}

      {cancelTarget ? (
        <CancelTransactionDialog
          title={`Cancel entry ${cancelTarget.reference}?`}
          description={`${formatINR2(cancelTarget.debit > 0 ? cancelTarget.debit : cancelTarget.credit)} (${cancelTarget.typeLabel}) will be reversed from the salary ledger and any linked bank payment will be cancelled. The entry stays visible as CANCELLED in the audit trail. This cannot be undone.`}
          confirmText="Cancel entry"
          isSaving={isCancelling}
          onConfirm={handleCancelEntry}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </div>
  );
};

export default StaffDetailPage;
