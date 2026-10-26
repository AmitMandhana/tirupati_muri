import { useEffect, useState } from 'react';

import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import { getCancelledTransactionsApi } from '../services/cancelService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, formatReceiptDate, formatReceiptTime } from '../utils/format';

const AuditTrailPage = () => {
  const [audit, setAudit] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    getCancelledTransactionsApi({ search: appliedSearch || undefined, limit: 200 })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setAudit(data);
        setLoadError('');
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load the audit trail.'));
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
  }, [appliedSearch, reloadToken]);

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setReloadToken((token) => token + 1);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();

    if (nextSearch === appliedSearch) {
      refresh();
      return;
    }

    setIsLoading(true);
    setLoadError('');
    setAppliedSearch(nextSearch);
  };

  const handleClear = () => {
    setSearchInput('');
    setIsLoading(true);
    setLoadError('');
    setAppliedSearch('');
  };

  const rows = audit?.rows ?? [];

  return (
    <div>
      <PageHeader
        title="Audit trail"
        description="Cancelled transactions are never deleted. They stay here with their reference number, cancellation time and reason, and are excluded from every ledger, report and balance."
        actions={
          <button type="button" className="btn-secondary" onClick={refresh} disabled={isLoading}>
            Refresh
          </button>
        }
      />

      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 flex-col gap-2 sm:flex-row">
          <input
            type="search"
            className="field-input sm:max-w-sm"
            placeholder="Search reference, type or reason"
            aria-label="Search cancelled transactions"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="btn-secondary" disabled={isLoading}>
            Search
          </button>
          {appliedSearch ? (
            <button type="button" className="btn-secondary" onClick={handleClear} disabled={isLoading}>
              Clear
            </button>
          ) : null}
        </form>
        <p className="text-sm text-ink-500">
          {audit
            ? `${rows.length} cancelled transaction${rows.length === 1 ? '' : 's'} shown`
            : '—'}
        </p>
      </section>

      {isLoading ? (
        <div className="card mt-4 flex items-center justify-center gap-3 px-5 py-16 text-sm text-ink-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Loading cancelled transactions...
        </div>
      ) : loadError ? (
        <div className="card mt-4 px-5 py-10">
          <h2 className="text-base font-semibold text-ink-900">Audit trail could not be loaded</h2>
          <p className="mt-1 text-sm text-ink-500">{loadError}</p>
          <button type="button" className="btn-secondary mt-4" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center px-5 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <NavIcon name="audit" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">No cancelled transactions</h2>
          <p className="mt-1 max-w-md text-sm text-ink-500">
            {appliedSearch
              ? 'No cancelled transaction matches this search. Try a different reference or reason.'
              : 'When a sale, invoice, payment, expense, staff entry, bank entry or production batch is cancelled, it will be listed here.'}
          </p>
        </div>
      ) : (
        <section className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                <tr className="border-b border-cream-200">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Reference
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Description
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Amount
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Cancelled
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {rows.map((row) => (
                  <tr key={`${row.type}-${row.id}`}>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="pill bg-red-50 text-red-700">CANCELLED</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink-900">
                      {row.reference}
                      <span className="mt-0.5 block text-[11px] font-normal text-ink-400">
                        {row.type}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-5 py-3.5 text-ink-700">{row.description || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-ink-700">
                      {row.date ? formatReceiptDate(row.date) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-ink-900">
                      {row.amount > 0 ? formatINR2(row.amount) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                      {row.cancelledAt ? (
                        <>
                          {formatReceiptDate(row.cancelledAt)}
                          <span className="mt-0.5 block text-[11px] text-ink-400">
                            {formatReceiptTime(row.cancelledAt)}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[220px] px-5 py-3.5 text-ink-500">{row.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400">
            {audit?.note ?? 'Cancelled transactions are kept for the audit trail.'}
          </p>
        </section>
      )}
    </div>
  );
};

export default AuditTrailPage;
