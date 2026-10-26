import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import CancelTransactionDialog from '../components/CancelTransactionDialog';
import PageHeader from '../components/PageHeader';
import PartyFormDialog from '../components/PartyFormDialog';
import ReceivePaymentDialog from '../components/ReceivePaymentDialog';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { cancelPartyPaymentApi } from '../services/cancelService';
import { getPartyApi } from '../services/partyService';
import { getApiErrorMessage } from '../utils/errors';
import {
  formatINR2,
  formatQuantity,
  formatRate,
  formatReceiptDate,
} from '../utils/format';
import { downloadLedgerPdf } from '../utils/ledgerPdf';
import {
  buildLedgerMessage,
  buildPaymentReminderMessage,
  buildWhatsAppUrl,
} from '../utils/whatsapp';

const LEDGER_TYPE_LABELS = {
  opening: 'Opening',
  invoice: 'Invoice',
  payment: 'Payment',
};

const PartyDetailPage = () => {
  const { id: partyId } = useParams();
  const { settings } = useBusinessSettings();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getPartyApi(partyId)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setDetail(data);
        setLoadError('');
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load the party ledger.'));
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
  }, [partyId, refreshToken]);

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshToken((token) => token + 1);
  };

  const handleCancelPayment = async (reason) => {
    if (!cancelTarget) {
      return;
    }

    setIsCancelling(true);

    try {
      const data = await cancelPartyPaymentApi(partyId, cancelTarget.id, reason);
      toast.success(data.message ?? 'Payment cancelled.');
      setCancelTarget(null);
      refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to cancel the payment.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const backLink = (
    <Link
      to="/parties"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
    >
      <span aria-hidden="true">&larr;</span>
      Back to parties
    </Link>
  );

  const isStale = detail && String(detail.party._id) !== String(partyId);
  const showLoading = (isLoading && !detail) || isStale;

  if (showLoading) {
    return (
      <div>
        {backLink}
        <div className="mt-4">
          <PageHeader title="Party ledger" description="Loading the account and its ledger..." />
        </div>
        <section className="card flex items-center justify-center gap-3 px-6 py-16 text-sm text-ink-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Loading party...
        </section>
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        {backLink}
        <div className="mt-4">
          <PageHeader title="Party ledger" description="The party could not be loaded." />
        </div>
        <section className="card px-6 py-10">
          <h2 className="text-base font-semibold text-ink-900">Party not available</h2>
          <p className="mt-1 text-sm text-ink-500">{loadError}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={refresh}>
              Try again
            </button>
            <Link to="/parties" className="btn-primary">
              Back to parties
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const { party, stats, credit, ledger } = detail;
  const outstanding = Number(stats.outstanding) || 0;
  const reminderMessage = buildPaymentReminderMessage({
    partyName: party.name,
    outstanding,
    businessName: settings.businessName,
  });
  const reminderUrl =
    outstanding > 0.005
      ? buildWhatsAppUrl({ phone: party.phone, message: reminderMessage })
      : '';
  const ledgerUrl = buildWhatsAppUrl({
    phone: party.phone,
    message: buildLedgerMessage({
      partyName: party.name,
      businessName: settings.businessName,
      openingBalance: party.openingBalance,
      invoicesTotal: stats.totalSales,
      paymentsTotal: stats.totalReceived,
      outstanding,
    }),
  });
  const reminderDisabled = !reminderUrl;
  const creditPercent =
    credit.limit > 0 ? Math.min((credit.used / credit.limit) * 100, 100) : 0;

  const handleDownloadLedger = async () => {
    try {
      await downloadLedgerPdf({
        title: 'Party Ledger',
        entityName: party.name,
        entityMeta: [party.phone, party.address],
        summary: [
          { label: 'Opening balance', value: party.openingBalance },
          { label: 'Invoices', value: stats.totalSales },
          { label: 'Payments received', value: stats.totalReceived },
          { label: 'Outstanding', value: outstanding },
        ],
        rows: ledger.map((entry) => ({
          date: entry.date,
          reference: entry.reference,
          description: entry.description,
          debit: entry.debit,
          credit: entry.credit,
          balance: entry.balance,
        })),
        settings,
        filename: `party-ledger-${party.name.replace(/[^\w-]+/g, '-')}.pdf`,
      });
      toast.success('Party ledger PDF downloaded.');
    } catch {
      toast.error('Unable to generate the party ledger PDF.');
    }
  };

  return (
    <div>
      {backLink}

      <div className="mt-4">
        <PageHeader
          title={party.name}
          description={`${party.phone}${party.address ? ` · ${party.address}` : ''}`}
          actions={
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditOpen(true)}
              >
                Edit party
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
              {reminderDisabled ? (
                <button
                  type="button"
                  className="btn-secondary opacity-60"
                  disabled
                  title={
                    outstanding <= 0.005
                      ? 'There is no outstanding balance to remind.'
                      : 'Add a phone number before sending a reminder.'
                  }
                >
                  Send Payment Reminder
                </button>
              ) : (
                <a
                  href={reminderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  Send Payment Reminder
                </a>
              )}
              {ledgerUrl ? (
                <a
                  href={ledgerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  title={`Send the ${party.name} ledger summary on WhatsApp`}
                >
                  Send Ledger on WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  className="btn-secondary opacity-60"
                  disabled
                  title="Add a phone number before sending the ledger."
                >
                  Send Ledger on WhatsApp
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsPaymentOpen(true)}
              >
                Receive payment
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

      {!party.active ? (
        <div className="mb-4 rounded-lg border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-ink-700">
          This party is inactive. Its ledger is still available, but new wholesale invoices cannot
          be raised until it is reactivated.
        </div>
      ) : null}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-900">Account details</h2>
          <span
            className={`pill ${
              party.active ? 'bg-emerald-50 text-emerald-700' : 'bg-cream-100 text-ink-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                party.active ? 'bg-emerald-500' : 'bg-ink-400'
              }`}
              aria-hidden="true"
            />
            {party.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-400">Phone</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">{party.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Opening balance</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {formatINR2(party.openingBalance)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Credit limit</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {credit.limit > 0 ? formatINR2(credit.limit) : 'No limit'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Party since</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {formatReceiptDate(party.createdAt)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-ink-400">Address</dt>
            <dd className="mt-0.5 font-medium text-ink-700">{party.address || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Last invoice</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {stats.lastInvoiceAt ? formatReceiptDate(stats.lastInvoiceAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Last payment</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {stats.lastPaymentAt ? formatReceiptDate(stats.lastPaymentAt) : '—'}
            </dd>
          </div>
        </dl>

        {party.notes ? (
          <p className="mt-4 rounded-lg bg-cream-50 px-4 py-3 text-xs leading-relaxed text-ink-500">
            <span className="font-semibold text-ink-700">Notes: </span>
            {party.notes}
          </p>
        ) : null}
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total invoices"
          icon="wholesale"
          value={stats.totalInvoices}
          formatValue={(value) => String(value)}
          hint={stats.totalInvoices === 1 ? '1 invoice' : `${stats.totalInvoices} invoices`}
        />
        <StatCard
          title="Total sales"
          icon="reports"
          value={stats.totalSales}
          formatValue={formatINR2}
          hint="Value of all invoices"
        />
        <StatCard
          title="Total received"
          icon="cashbook"
          value={stats.totalReceived}
          formatValue={formatINR2}
          hint="At invoice and later receipts"
        />
        <StatCard
          title="Outstanding"
          icon="loans"
          value={stats.outstanding}
          formatValue={formatINR2}
          hint={
            outstanding < -0.005
              ? 'Advance held for this party'
              : outstanding > 0.005
                ? 'Amount to collect'
                : 'Settled in full'
          }
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <section className="card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/60 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Party ledger</h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Opening balance, invoices and payments in date order
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
                Raise a wholesale invoice or record a payment to start this party&apos;s ledger.
              </p>
              <Link to="/wholesale" className="btn-primary mt-4">
                Open wholesale billing
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                    <tr className="border-b border-cream-200">
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Date
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Reference
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
                    {ledger.map((entry) => {
                      const metaLine =
                        entry.type === 'invoice' && entry.meta
                          ? `${formatQuantity(entry.meta.quantity)} ${entry.meta.unit} × ${formatRate(entry.meta.rate)}`
                          : '';

                      return (
                        <tr key={entry.id} className="align-top">
                          <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                            {formatReceiptDate(entry.date)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <p className="font-semibold text-ink-900">{entry.reference}</p>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-400">
                              {LEDGER_TYPE_LABELS[entry.type] ?? entry.type}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-ink-900">{entry.description}</p>
                            {metaLine ? (
                              <p className="mt-0.5 text-xs text-ink-400">{metaLine}</p>
                            ) : null}
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
                            {entry.type === 'payment' ? (
                              <button
                                type="button"
                                className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                                onClick={() => setCancelTarget(entry)}
                              >
                                Cancel
                              </button>
                            ) : (
                              <span className="text-ink-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-cream-300 bg-cream-50/70">
                      <td colSpan={6} className="px-5 py-3 text-right text-sm font-semibold text-ink-700">
                        Current outstanding
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-base font-semibold text-ink-900">
                        {formatINR2(outstanding)}
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
            <h2 className="text-base font-semibold text-ink-900">Credit limit</h2>
            {credit.limit > 0 ? (
              <>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-500">Used</span>
                  <span className="font-semibold text-ink-900">
                    {formatINR2(credit.used)} of {formatINR2(credit.limit)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-200">
                  <div
                    className={`h-full rounded-full ${
                      credit.exceeded ? 'bg-red-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${creditPercent}%` }}
                  />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-500">Available</span>
                  <span className="font-semibold text-ink-900">
                    {formatINR2(credit.available ?? 0)}
                  </span>
                </div>
                {credit.exceeded ? (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    This party is over its credit limit. New credit invoices are blocked.
                  </p>
                ) : (
                  <p className="mt-3 text-xs leading-relaxed text-ink-400">
                    New credit invoices cannot take the outstanding above this limit.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  No credit limit is set for this party. Add one to control how much credit can be
                  outstanding.
                </p>
                <button
                  type="button"
                  className="btn-secondary mt-3 w-full"
                  onClick={() => setIsEditOpen(true)}
                >
                  Set credit limit
                </button>
              </>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-ink-900">How the balance works</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              Debit is what the party owes. Credit is money received. Balance is debit minus credit
              plus the opening balance, recalculated from the ledger every time.
            </p>
            <div className="mt-3 rounded-lg bg-cream-50 px-3 py-2 text-xs text-ink-500">
              {formatINR2(party.openingBalance)} opening + {formatINR2(stats.totalSales)} invoices −{' '}
              {formatINR2(stats.totalReceived)} received = {formatINR2(outstanding)}
            </div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
              onClick={() => setIsPaymentOpen(true)}
            >
              Receive a payment
              <span aria-hidden="true">&rarr;</span>
            </button>
          </section>
        </aside>
      </div>

      {isPaymentOpen ? (
        <ReceivePaymentDialog
          party={party}
          outstanding={outstanding}
          onClose={() => setIsPaymentOpen(false)}
          onSaved={() => {
            setIsPaymentOpen(false);
            refresh();
          }}
        />
      ) : null}

      {isEditOpen ? (
        <PartyFormDialog
          party={party}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => {
            setIsEditOpen(false);
            refresh();
          }}
        />
      ) : null}

      {cancelTarget ? (
        <CancelTransactionDialog
          title={`Cancel payment ${cancelTarget.reference}?`}
          description={`${formatINR2(cancelTarget.credit)} received from ${party.name} will be reversed from the party ledger and any linked bank receipt will be cancelled. The payment will stay visible as CANCELLED in the audit trail. This cannot be undone.`}
          confirmText="Cancel payment"
          isSaving={isCancelling}
          onConfirm={handleCancelPayment}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </div>
  );
};

export default PartyDetailPage;
