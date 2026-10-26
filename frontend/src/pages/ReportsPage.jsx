import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import ReportPreviewDialog from '../components/ReportPreviewDialog';
import Spinner from '../components/Spinner';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { getBankAccountsApi } from '../services/bankAccountService';
import { getExpenseCategoriesApi } from '../services/expenseService';
import { getPartiesApi } from '../services/partyService';
import { getReportApi } from '../services/reportService';
import { getApiErrorMessage } from '../utils/errors';
import { toDateInputValue } from '../utils/format';
import { downloadReportCsv } from '../utils/reportCsv';
import {
  REPORT_GROUPS,
  describeReportFilters,
  formatReportCell,
  formatReportValue,
  getColumnAlign,
  getExtraTable,
  getReportDefinition,
  getReportSummaryItems,
  getReportTotals,
} from '../utils/reports';

const createDefaultFilters = (key) => {
  const today = toDateInputValue();
  const month = today.slice(0, 7);
  const monthStart = `${month}-01`;

  switch (key) {
    case 'daily-sales':
      return { date: today, search: '' };
    case 'monthly-sales':
      return { month };
    case 'sales-range':
      return { from: monthStart, to: today, search: '' };
    case 'expenses':
      return { from: monthStart, to: today, category: '', search: '' };
    case 'cash-book':
      return { from: monthStart, to: today };
    case 'bank':
      return { from: monthStart, to: today, account: '', search: '' };
    case 'party-outstanding':
      return { asOf: today, search: '' };
    case 'party-ledger':
      return { party: '', from: monthStart, to: today };
    default:
      return { from: monthStart, to: today, search: '' };
  }
};

const cleanParams = (filters) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );

const cellAlign = (column) => getColumnAlign(column) === 'right';

const ReportTable = ({ columns, rows, totals, emptyText }) => (
  <table className="w-full min-w-[640px] border-collapse text-left text-xs">
    <thead>
      <tr className="border-b border-cream-300 bg-cream-50 text-[10px] uppercase tracking-[0.06em] text-ink-500">
        {columns.map((column) => (
          <th
            key={column.key}
            scope="col"
            className={`whitespace-nowrap px-2 py-2 font-semibold ${
              cellAlign(column) ? 'text-right' : 'text-left'
            }`}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-cream-200">
      {rows.length === 0 ? (
        <tr>
          <td colSpan={columns.length} className="px-3 py-8 text-center text-xs text-ink-400">
            {emptyText}
          </td>
        </tr>
      ) : (
        rows.map((row, index) => (
          <tr key={index} className="align-top text-ink-700">
            {columns.map((column) => (
              <td
                key={column.key}
                className={`px-2 py-2 ${
                  cellAlign(column) ? 'whitespace-nowrap text-right' : 'text-left'
                }`}
              >
                {formatReportCell(column, row)}
              </td>
            ))}
          </tr>
        ))
      )}
    </tbody>
    {rows.length > 0 && totals && Object.keys(totals).length > 0 ? (
      <tfoot>
        <tr className="border-t-2 border-ink-900 text-ink-900">
          <td className="px-2 py-2 font-semibold">Total · {rows.length} rows</td>
          {columns.slice(1).map((column) => (
            <td
              key={column.key}
              className={`whitespace-nowrap px-2 py-2 font-semibold ${
                cellAlign(column) ? 'text-right' : 'text-left'
              }`}
            >
              {totals[column.key] !== undefined
                ? formatReportValue(column.format, totals[column.key])
                : ''}
            </td>
          ))}
        </tr>
      </tfoot>
    ) : null}
  </table>
);

const ReportsPage = () => {
  const { settings } = useBusinessSettings();
  const todayKey = toDateInputValue();
  const currentMonthKey = todayKey.slice(0, 7);

  const [activeKey, setActiveKey] = useState('daily-sales');
  const [filters, setFilters] = useState(() => createDefaultFilters('daily-sales'));
  const [applied, setApplied] = useState(() => ({
    key: 'daily-sales',
    filters: createDefaultFilters('daily-sales'),
  }));
  const [filterError, setFilterError] = useState('');
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [parties, setParties] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  const definition = getReportDefinition(activeKey);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([getPartiesApi(), getBankAccountsApi(), getExpenseCategoriesApi()]).then(
      (results) => {
        if (!isMounted) {
          return;
        }

        const [partyResult, accountResult, categoryResult] = results;

        if (partyResult.status === 'fulfilled') {
          setParties(partyResult.value.parties ?? []);
        }

        if (accountResult.status === 'fulfilled') {
          setAccounts(accountResult.value.accounts ?? []);
        }

        if (categoryResult.status === 'fulfilled') {
          setCategories(categoryResult.value.categories ?? []);
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (applied.key === 'party-ledger' && !applied.filters.party) {
      return undefined;
    }

    let isMounted = true;

    getReportApi(applied.key, cleanParams(applied.filters))
      .then((data) => {
        if (isMounted) {
          setReport(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setReport(null);
          setLoadError(getApiErrorMessage(error, 'Unable to generate this report.'));
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
  }, [applied]);

  const chooseReport = (key) => {
    const defaults = createDefaultFilters(key);
    setActiveKey(key);
    setFilters(defaults);
    setApplied({ key, filters: defaults });
    setFilterError('');
    setLoadError('');
    setIsLoading(key !== 'party-ledger');
    setPreviewOpen(false);
    setReport(null);
  };

  const updateFilter = (name, value) => {
    setFilterError('');
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const validateFilters = () => {
    if (definition.filters.date && !filters.date) {
      return 'Select a sales date.';
    }

    if (definition.filters.month && !filters.month) {
      return 'Select a month.';
    }

    if (definition.filters.asOf && !filters.asOf) {
      return 'Select an as-of date.';
    }

    if (definition.filters.party && !filters.party) {
      return 'Select a party.';
    }

    if (definition.filters.range) {
      if (!filters.from || !filters.to) {
        return 'Select both a from and a to date.';
      }

      if (filters.from > filters.to) {
        return 'The from date cannot be after the to date.';
      }
    }

    return '';
  };

  const handleGenerate = (event) => {
    event.preventDefault();
    const message = validateFilters();

    if (message) {
      setFilterError(message);
      return;
    }

    setFilterError('');
    setIsLoading(true);
    setLoadError('');
    setApplied({ key: activeKey, filters });
  };

  const handleDownloadCsv = () => {
    try {
      downloadReportCsv(report, definition, settings);
      toast.success('Report CSV downloaded.');
    } catch {
      toast.error('Unable to generate the report CSV.');
    }
  };

  const summaryItems = report ? getReportSummaryItems(definition, report) : [];
  const totals = report ? getReportTotals(definition, report.rows) : null;
  const extra = report ? getExtraTable(definition, report) : null;

  const renderFilters = () => (
    <>
      {definition.filters.date ? (
        <FormField label="Sales date" htmlFor="report-date">
          <input
            id="report-date"
            type="date"
            className="field-input"
            value={filters.date ?? ''}
            max={todayKey}
            onChange={(event) => updateFilter('date', event.target.value)}
          />
        </FormField>
      ) : null}

      {definition.filters.month ? (
        <FormField label="Month" htmlFor="report-month">
          <input
            id="report-month"
            type="month"
            className="field-input"
            value={filters.month ?? ''}
            max={currentMonthKey}
            onChange={(event) => updateFilter('month', event.target.value)}
          />
        </FormField>
      ) : null}

      {definition.filters.asOf ? (
        <FormField label="As of date" htmlFor="report-asof">
          <input
            id="report-asof"
            type="date"
            className="field-input"
            value={filters.asOf ?? ''}
            max={todayKey}
            onChange={(event) => updateFilter('asOf', event.target.value)}
          />
        </FormField>
      ) : null}

      {definition.filters.range ? (
        <>
          <FormField label="From" htmlFor="report-from">
            <input
              id="report-from"
              type="date"
              className="field-input"
              value={filters.from ?? ''}
              max={todayKey}
              onChange={(event) => updateFilter('from', event.target.value)}
            />
          </FormField>
          <FormField label="To" htmlFor="report-to">
            <input
              id="report-to"
              type="date"
              className="field-input"
              value={filters.to ?? ''}
              max={todayKey}
              onChange={(event) => updateFilter('to', event.target.value)}
            />
          </FormField>
        </>
      ) : null}

      {definition.filters.party ? (
        <FormField label="Party" htmlFor="report-party" required>
          <select
            id="report-party"
            className="field-input"
            value={filters.party ?? ''}
            onChange={(event) => updateFilter('party', event.target.value)}
          >
            <option value="">Select a party</option>
            {parties.map((party) => (
              <option key={party._id} value={party._id}>
                {party.name}
                {party.phone ? ` · ${party.phone}` : ''}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      {definition.filters.account ? (
        <FormField label="Bank account" htmlFor="report-account">
          <select
            id="report-account"
            className="field-input"
            value={filters.account ?? ''}
            onChange={(event) => updateFilter('account', event.target.value)}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.bankName} · {account.maskedAccountNumber}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      {definition.filters.category ? (
        <FormField label="Category" htmlFor="report-category">
          <select
            id="report-category"
            className="field-input"
            value={filters.category ?? ''}
            onChange={(event) => updateFilter('category', event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category.nameKey}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      {definition.filters.search ? (
        <FormField label="Search" htmlFor="report-search">
          <input
            id="report-search"
            type="search"
            className="field-input"
            placeholder={definition.searchPlaceholder}
            value={filters.search ?? ''}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </FormField>
      ) : null}

      <div className="flex items-end">
        <button type="submit" className="btn-primary w-full" disabled={isLoading}>
          {isLoading ? <Spinner /> : null}
          Generate report
        </button>
      </div>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Print-ready business reports built from recorded transactions. Every report supports date filters, search where it applies, printing, PDF and CSV export."
        actions={
          <Link to="/" className="btn-secondary">
            Back to dashboard
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[236px,1fr]">
        <aside className="card h-fit p-3">
          {REPORT_GROUPS.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.reports.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => chooseReport(item.key)}
                    aria-pressed={activeKey === item.key}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                      activeKey === item.key
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-ink-700 hover:bg-cream-50'
                    }`}
                  >
                    <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="card p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{definition.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {definition.description}
                </p>
              </div>
              {report ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setPreviewOpen(true)}
                  >
                    Print / PDF
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleDownloadCsv}>
                    CSV
                  </button>
                </div>
              ) : null}
            </div>

            <form onSubmit={handleGenerate} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {renderFilters()}
            </form>

            {filterError ? (
              <p role="alert" className="mt-3 text-xs font-medium text-red-600">
                {filterError}
              </p>
            ) : null}
          </section>

          {loadError ? (
            <section role="alert" className="card border-red-200 bg-red-50/70 p-4">
              <p className="text-sm font-semibold text-red-800">Report unavailable</p>
              <p className="mt-1 text-xs text-red-700">{loadError}</p>
            </section>
          ) : null}

          {!report && !isLoading && !loadError ? (
            <section className="card p-6 text-sm text-ink-500">
              {activeKey === 'party-ledger' && !filters.party
                ? 'Select a party and choose a date range, then generate the ledger.'
                : 'Choose your filters and generate the report.'}
            </section>
          ) : null}

          {!report && isLoading ? (
            <section className="card flex items-center gap-3 p-6 text-sm text-ink-500">
              <Spinner />
              Generating report...
            </section>
          ) : null}

          {report ? (
            <>
              <section className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-cream-200 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                      Period
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-900">
                      {report.range?.label}
                    </p>
                  </div>
                  <p className="text-xs text-ink-500">{describeReportFilters(report)}</p>
                </div>

                {summaryItems.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    {summaryItems.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-lg border border-cream-200 bg-cream-50/60 px-3 py-2.5"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-400">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-ink-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="card overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-cream-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-ink-900">Report rows</h3>
                  <div className="flex items-center gap-2">
                    {isLoading ? <Spinner className="h-3.5 w-3.5 text-ink-400" /> : null}
                    <p className="text-xs text-ink-400">
                      {report.rows.length} {report.rows.length === 1 ? 'row' : 'rows'}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <ReportTable
                    columns={definition.columns}
                    rows={report.rows}
                    totals={(definition.totals ?? []).length > 0 ? totals : null}
                    emptyText={definition.emptyText}
                  />
                </div>

                {extra ? (
                  <div className="border-t border-cream-200 px-4 py-4">
                    <h3 className="text-sm font-semibold text-ink-900">{extra.title}</h3>
                    <div className="mt-2 overflow-x-auto">
                      <ReportTable
                        columns={extra.columns}
                        rows={extra.rows}
                        totals={(extra.totals ?? []).length > 0 ? extra.totals : null}
                        emptyText={definition.emptyText}
                      />
                    </div>
                  </div>
                ) : null}
              </section>

              {report.notes?.length ? (
                <section className="card p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-ink-900">Notes</h3>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-500">
                    {report.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {previewOpen && report ? (
        <ReportPreviewDialog
          report={report}
          definition={definition}
          settings={settings}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
};

export default ReportsPage;
