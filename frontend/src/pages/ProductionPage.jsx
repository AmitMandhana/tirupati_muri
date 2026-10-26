import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import ProductionFormDialog from '../components/ProductionFormDialog';
import ProductionReportDialog from '../components/ProductionReportDialog';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { getProductionsApi } from '../services/productionService';
import { getApiErrorMessage } from '../utils/errors';
import { formatQuantity, formatReceiptDate } from '../utils/format';
import { downloadProductionPdf } from '../utils/productionPdf';

const formatKg = (value) => `${formatQuantity(value)} KG`;
const formatPercent = (value) => `${Number(value).toFixed(2)}%`;

const ProductionPage = () => {
  const { settings } = useBusinessSettings();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productions, setProductions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (fromDate && toDate && fromDate > toDate) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      getProductionsApi({
        search: search.trim() || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
        .then((data) => {
          if (!isMounted) {
            return;
          }

          setProductions(Array.isArray(data.productions) ? data.productions : []);
          setSummary(data.summary ?? null);
          setLoadError('');
        })
        .catch((error) => {
          if (isMounted) {
            setLoadError(getApiErrorMessage(error, 'Unable to load production history.'));
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
  }, [search, fromDate, toDate, refreshToken]);

  const hasFilters = Boolean(search.trim() || fromDate || toDate);
  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);
  const filters = { search, from: fromDate, to: toDate };

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshToken((token) => token + 1);
  };

  const resetAndSet = (setter, value) => {
    setIsLoading(true);
    setLoadError('');
    setter(value);
  };

  const clearFilters = () => {
    if (!hasFilters) {
      return;
    }

    setIsLoading(true);
    setLoadError('');
    setSearch('');
    setFromDate('');
    setToDate('');
  };

  const handleSaved = () => {
    setIsFormOpen(false);
    refresh();
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadProductionPdf(productions, settings, filters);
      toast.success('Production PDF downloaded.');
    } catch {
      toast.error('Unable to generate the production PDF.');
    }
  };

  const batchCount = summary?.count ?? 0;

  return (
    <div>
      <PageHeader
        title="Production"
        description="Record each Muri production batch. Yield is calculated from finished Muri and raw material, and finished Muri is added to stock once per record."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsReportOpen(true)}
              disabled={productions.length === 0}
            >
              Print
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownloadPdf}
              disabled={productions.length === 0}
            >
              Download PDF
            </button>
            <button type="button" className="btn-primary" onClick={() => setIsFormOpen(true)}>
              Record production
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Finished Muri"
          icon="production"
          value={summary?.finishedKg ?? null}
          formatValue={formatKg}
          hint={
            summary
              ? batchCount === 1
                ? '1 batch for the selected filters'
                : `${batchCount} batches for the selected filters`
              : 'For the selected filters'
          }
        />
        <StatCard
          title="Raw material"
          icon="stock"
          value={summary?.rawMaterialKg ?? null}
          formatValue={formatKg}
          hint="Recorded raw material processed"
        />
        <StatCard
          title="Wastage / loss"
          icon="expenses"
          value={summary?.wastageKg ?? null}
          formatValue={formatKg}
          hint="Recorded loss for the selected filters"
        />
        <StatCard
          title="Yield"
          icon="reports"
          value={summary?.yieldPercent ?? null}
          formatValue={formatPercent}
          hint="Finished muri ÷ raw material × 100"
        />
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-cream-200 bg-cream-50/60 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(140px,0.6fr)_minmax(140px,0.6fr)_auto] sm:items-end">
            <FormField label="Search" htmlFor="production-search">
              <input
                id="production-search"
                type="search"
                className="field-input"
                placeholder="Production number or notes"
                value={search}
                onChange={(event) => resetAndSet(setSearch, event.target.value)}
              />
            </FormField>
            <FormField label="From" htmlFor="production-from">
              <input
                id="production-from"
                type="date"
                className="field-input"
                value={fromDate}
                onChange={(event) => resetAndSet(setFromDate, event.target.value)}
              />
            </FormField>
            <FormField label="To" htmlFor="production-to">
              <input
                id="production-to"
                type="date"
                className="field-input"
                value={toDate}
                onChange={(event) => resetAndSet(setToDate, event.target.value)}
              />
            </FormField>
            <button
              type="button"
              className="btn-secondary h-[42px]"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Clear filters
            </button>
          </div>
        </div>

        {dateRangeInvalid ? (
          <div className="px-5 py-10">
            <h2 className="text-base font-semibold text-ink-900">Check the date range</h2>
            <p className="mt-1 text-sm text-ink-500">
              The from date cannot be after the to date.
            </p>
            <button type="button" className="btn-secondary mt-4" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-ink-500">
            <Spinner className="h-4 w-4 text-brand-600" />
            Loading production history...
          </div>
        ) : loadError ? (
          <div className="px-5 py-10">
            <h2 className="text-base font-semibold text-ink-900">
              Production history could not be loaded
            </h2>
            <p className="mt-1 text-sm text-ink-500">{loadError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : productions.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="production" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink-900">
              {hasFilters ? 'No matching production records' : 'No production recorded yet'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              {hasFilters
                ? 'Try a different search term or date range.'
                : 'Record a batch to calculate its yield and add finished Muri to stock.'}
            </p>
            {hasFilters ? (
              <button type="button" className="btn-secondary mt-4" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => setIsFormOpen(true)}
              >
                Record production
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                  <tr className="border-b border-cream-200">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Date
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Production no.
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Raw material
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Finished muri
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Wastage
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Yield
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {productions.map((production) => (
                    <tr key={production._id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                        {formatReceiptDate(production.productionDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <p className="font-semibold text-ink-900">
                          {production.productionNumber}
                        </p>
                        {production.notes ? (
                          <p className="mt-0.5 max-w-[240px] truncate text-xs text-ink-400">
                            {production.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-ink-700">
                        {formatQuantity(production.rawMaterialKg)} KG
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-ink-900">
                        {formatQuantity(production.finishedKg)} KG
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-ink-700">
                        {formatQuantity(production.wastageKg)} KG
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <span className="pill bg-brand-50 text-brand-700">
                          {formatPercent(production.yieldPercent)}
                        </span>
                        <p className="mt-1 text-[11px] text-ink-400">
                          {formatQuantity(production.rawMaterialPerKg)} KG raw / KG
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400">
              Showing up to 200 production records. Finished Muri is added to stock when a record
              is saved; raw material stays on the production record only.
            </p>
          </>
        )}
      </section>

      {isFormOpen ? (
        <ProductionFormDialog
          onClose={() => setIsFormOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {isReportOpen ? (
        <ProductionReportDialog
          productions={productions}
          filters={filters}
          onClose={() => setIsReportOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default ProductionPage;
