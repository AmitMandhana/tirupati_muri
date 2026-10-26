import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { getReceivablesApi } from '../services/partyService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, formatReceiptDate } from '../utils/format';
import { buildPaymentReminderMessage, buildWhatsAppUrl } from '../utils/whatsapp';

const ReceivablesPage = () => {
  const { settings } = useBusinessSettings();
  const [search, setSearch] = useState('');
  const [parties, setParties] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const timer = window.setTimeout(() => {
      getReceivablesApi({ search: search.trim() || undefined })
        .then((data) => {
          if (!isMounted) {
            return;
          }

          setParties(Array.isArray(data.parties) ? data.parties : []);
          setSummary(data.summary ?? null);
          setLoadError('');
        })
        .catch((error) => {
          if (isMounted) {
            setLoadError(getApiErrorMessage(error, 'Unable to load receivables.'));
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [search, refreshToken]);

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshToken((token) => token + 1);
  };

  const handleSearchChange = (event) => {
    setIsLoading(true);
    setLoadError('');
    setSearch(event.target.value);
  };

  return (
    <div>
      <PageHeader
        title="Accounts Receivable"
        description="Party outstanding balances, latest invoices and payments, sorted by the highest amount due. Balances come from each party's opening balance, invoices and recorded receipts."
        actions={
          <Link to="/parties" className="btn-secondary">
            Manage parties
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total receivable"
          icon="loans"
          value={summary?.totalOutstanding ?? null}
          formatValue={formatINR2}
          hint={
            summary
              ? `${summary.partyCount} ${summary.partyCount === 1 ? 'party has' : 'parties have'} an outstanding balance`
              : 'Loading receivables...'
          }
        />
        <StatCard
          title="Parties with dues"
          icon="parties"
          value={summary?.partyCount ?? null}
          formatValue={(value) => String(value)}
          hint="Sorted by highest outstanding"
        />
        <StatCard
          title="Cash received"
          icon="cashbook"
          value={summary?.cashReceived ?? null}
          formatValue={formatINR2}
          hint="Recorded receipts, all time"
        />
        <StatCard
          title="Bank received"
          icon="bank"
          value={summary?.bankReceived ?? null}
          formatValue={formatINR2}
          hint="UPI and bank receipts, all time"
        />
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-cream-200 bg-cream-50/60 px-5 py-4">
          <div className="max-w-md">
            <FormField label="Search" htmlFor="receivable-search">
              <input
                id="receivable-search"
                type="search"
                className="field-input"
                placeholder="Party name or phone"
                value={search}
                onChange={handleSearchChange}
              />
            </FormField>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-ink-500">
            <Spinner className="h-4 w-4 text-brand-600" />
            Loading receivables...
          </div>
        ) : loadError ? (
          <div className="px-5 py-10">
            <h2 className="text-base font-semibold text-ink-900">Receivables could not be loaded</h2>
            <p className="mt-1 text-sm text-ink-500">{loadError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : parties.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="check" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink-900">
              {search.trim() ? 'No matching outstanding parties' : 'No outstanding balances'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              {search.trim()
                ? 'Try a different party name or phone number.'
                : 'Every party with a balance will appear here, highest outstanding first.'}
            </p>
            {search.trim() ? (
              <button
                type="button"
                className="btn-secondary mt-4"
                onClick={() => {
                  setIsLoading(true);
                  setSearch('');
                }}
              >
                Clear search
              </button>
            ) : (
              <Link to="/wholesale" className="btn-primary mt-4">
                Open wholesale billing
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                  <tr className="border-b border-cream-200">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Party
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Phone
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Outstanding
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Last payment
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Last invoice
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Credit limit
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {parties.map((party) => {
                    const reminderMessage = buildPaymentReminderMessage({
                      partyName: party.name,
                      outstanding: party.outstanding,
                      businessName: settings.businessName,
                    });
                    const reminderUrl = buildWhatsAppUrl({
                      phone: party.phone,
                      message: reminderMessage,
                    });

                    return (
                      <tr key={party._id} className="align-top">
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/parties/${party._id}`}
                            className="font-semibold text-ink-900 hover:text-brand-700"
                          >
                            {party.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {party.active ? null : (
                              <span className="pill bg-cream-100 text-ink-500">Inactive</span>
                            )}
                            {party.creditLimitExceeded ? (
                              <span className="pill bg-red-50 text-red-700">Over limit</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                          {party.phone}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-base font-semibold text-red-700">
                          {formatINR2(party.outstanding)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                          {party.lastPaymentAt ? formatReceiptDate(party.lastPaymentAt) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                          {party.lastInvoiceAt ? formatReceiptDate(party.lastInvoiceAt) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-ink-700">
                          {party.creditLimit > 0 ? formatINR2(party.creditLimit) : 'No limit'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/parties/${party._id}`}
                              className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                            >
                              Ledger
                            </Link>
                            {reminderUrl ? (
                              <a
                                href={reminderUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                                title="Send a WhatsApp payment reminder"
                              >
                                Remind
                              </a>
                            ) : (
                              <span className="rounded-md border border-cream-200 px-2.5 py-1.5 text-xs font-semibold text-ink-400">
                                Remind
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400">
              Outstanding is opening balance plus invoice totals minus amounts received. Cash and
              bank receipts show all recorded payments, not only the filtered rows.
            </p>
          </>
        )}
      </section>
    </div>
  );
};

export default ReceivablesPage;
