import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import NavIcon from '../components/NavIcon';
import SalesChart from '../components/SalesChart';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { getDashboardApi } from '../services/dashboardService';
import { getApiErrorMessage } from '../utils/errors';
import {
  formatINR,
  formatLongDate,
  formatQuantity,
  formatReceiptDate,
  formatReceiptTime,
  toDateInputValue,
} from '../utils/format';

const RANGE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

const quickLinks = [
  { to: '/retail-billing', label: 'Retail Billing', icon: 'billing', description: 'Counter sales' },
  { to: '/wholesale', label: 'Wholesale', icon: 'wholesale', description: 'Party invoices' },
  { to: '/cash-book', label: 'Cash Book', icon: 'cashbook', description: 'Daily cash position' },
  { to: '/expenses', label: 'Expenses', icon: 'expenses', description: 'Costs & categories' },
  { to: '/stock', label: 'Stock', icon: 'stock', description: 'Balance & ledger' },
  { to: '/reports', label: 'Reports', icon: 'reports', description: 'Printable summaries' },
];

const ACCOUNTING_RULES = [
  ['Sales', 'Retail bills plus wholesale invoices, including credit sales.'],
  ['Collections', 'Party receipts and cash received against invoices — never counted again as sales.'],
  ['Expenses', 'Recorded costs, split into cash and bank payments.'],
  ['Cash', 'Opening cash plus cash in, minus cash out.'],
  ['Bank', 'Deposits minus withdrawals across all bank accounts.'],
  ['Loans', 'Loan receipts, repayments and interest, kept separate from sales.'],
  ['Receivables', 'Party opening balances plus invoices, minus receipts and payments.'],
];

const countLabel = (count, singular, plural) =>
  `${count} ${count === 1 ? singular : plural}`;

const signedINR = (value) => {
  const amount = Number(value) || 0;

  if (amount === 0) {
    return formatINR(0);
  }

  return `${amount > 0 ? '+' : '-'}${formatINR(Math.abs(amount))}`;
};

const SectionCard = ({ title, description, action, children, className = '' }) => (
  <section className={`card p-5 ${className}`}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    {children}
  </section>
);

const Metric = ({ label, value, hint, tone = 'text-ink-900' }) => (
  <div className="rounded-lg border border-cream-200 bg-cream-50/70 px-3.5 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</p>
    <p className={`mt-1 text-lg font-semibold tracking-tight ${tone}`}>{value}</p>
    {hint ? <p className="mt-1 text-[11px] leading-snug text-ink-500">{hint}</p> : null}
  </div>
);

const FlowList = ({ title, total, items, tone }) => (
  <div className="rounded-lg border border-cream-200 bg-white p-3.5">
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{title}</p>
      <p className={`text-sm font-semibold ${tone}`}>{formatINR(total)}</p>
    </div>
    <dl className="mt-2 space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-3 text-xs">
          <dt className="text-ink-500">{item.label}</dt>
          <dd className="font-medium text-ink-700">{formatINR(item.value)}</dd>
        </div>
      ))}
    </dl>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const { settings } = useBusinessSettings();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const todayKey = toDateInputValue();

  const [rangeKey, setRangeKey] = useState('today');
  const [query, setQuery] = useState({ range: 'today' });
  const [customFrom, setCustomFrom] = useState(todayKey);
  const [customTo, setCustomTo] = useState(todayKey);
  const [customError, setCustomError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    getDashboardApi(query)
      .then((data) => {
        if (isMounted) {
          setDashboard(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load the dashboard.'));
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
  }, [query, refreshToken]);

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshToken((token) => token + 1);
  };

  const chooseRange = (key) => {
    setRangeKey(key);
    setCustomError('');

    if (key !== 'custom') {
      setIsLoading(true);
      setLoadError('');
      setQuery({ range: key });
    }
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      setCustomError('Select both a from and a to date.');
      return;
    }

    if (customFrom > customTo) {
      setCustomError('The from date cannot be after the to date.');
      return;
    }

    setCustomError('');
    setIsLoading(true);
    setLoadError('');
    setQuery({ range: 'custom', from: customFrom, to: customTo });
  };

  const months = dashboard?.monthly;
  const flow = dashboard?.cashFlow;
  const changeTone =
    months && months.change.amount > 0
      ? 'text-emerald-700'
      : months && months.change.amount < 0
        ? 'text-red-600'
        : 'text-ink-500';

  const comparisonText = months
    ? months.change.percent === null
      ? 'No sales were recorded in the previous month'
      : `${months.change.percent > 0 ? '+' : ''}${months.change.percent}% vs ${months.previous.label} (${formatINR(months.previous.total)})`
    : '';

  const header = (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              {formatLongDate(new Date())}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              {settings.businessName}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              Welcome back{firstName ? `, ${firstName}` : ''}. Every figure below is calculated from
              recorded bills, invoices, receipts, payments, expenses, stock movements, production
              batches and bank transactions.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {dashboard ? (
              <p className="text-xs text-ink-400">
                Updated {formatReceiptTime(dashboard.generatedAt)}
              </p>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              onClick={refresh}
              disabled={isLoading}
            >
              {isLoading ? <Spinner /> : null}
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-cream-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Dashboard date range"
              className="inline-flex rounded-lg border border-cream-200 bg-cream-50 p-1"
            >
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => chooseRange(option.key)}
                  aria-pressed={rangeKey === option.key}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    rangeKey === option.key
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {dashboard ? (
              <span className="pill border border-cream-200 bg-white text-ink-500">
                {dashboard.range.label} · {countLabel(dashboard.range.days, 'day', 'days')}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-ink-400">
            Cash is shown as of the range end date. Bank and party balances are current.
          </p>
        </div>

        {rangeKey === 'custom' ? (
          <div className="flex flex-col gap-3 rounded-lg border border-cream-200 bg-cream-50/60 p-3 sm:flex-row sm:items-end">
            <div className="sm:w-40">
              <label className="field-label" htmlFor="dashboard-from">
                From
              </label>
              <input
                id="dashboard-from"
                type="date"
                className="field-input"
                value={customFrom}
                max={todayKey}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
            </div>
            <div className="sm:w-40">
              <label className="field-label" htmlFor="dashboard-to">
                To
              </label>
              <input
                id="dashboard-to"
                type="date"
                className="field-input"
                value={customTo}
                max={todayKey}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </div>
            <button type="button" className="btn-primary sm:mb-0" onClick={applyCustomRange}>
              Apply range
            </button>
            {customError ? (
              <p role="alert" className="text-xs font-medium text-red-600">
                {customError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );

  if (!dashboard) {
    return (
      <div className="space-y-6">
        {header}
        {loadError ? (
          <section role="alert" className="card border-red-200 bg-red-50/70 p-5">
            <h2 className="text-sm font-semibold text-red-800">Dashboard unavailable</h2>
            <p className="mt-1 text-sm text-red-700">{loadError}</p>
            <button type="button" className="btn-secondary mt-3" onClick={refresh}>
              Try again
            </button>
          </section>
        ) : (
          <section className="card flex items-center gap-3 p-6 text-sm text-ink-500">
            <Spinner />
            Loading dashboard figures...
          </section>
        )}
      </div>
    );
  }

  const { cards, sales, expenses, receivables, production, stock } = dashboard;

  const statCards = [
    {
      title: cards.sales.label,
      icon: 'billing',
      value: cards.sales.value,
      hint: `${countLabel(cards.sales.count, 'bill', 'bills')} · retail ${formatINR(
        cards.sales.retail,
      )} · wholesale ${formatINR(cards.sales.wholesale)}`,
    },
    {
      title: cards.expenses.label,
      icon: 'expenses',
      value: cards.expenses.value,
      hint: `${countLabel(cards.expenses.count, 'entry', 'entries')} · cash ${formatINR(
        cards.expenses.cash,
      )} · bank ${formatINR(cards.expenses.bank)}`,
    },
    {
      title: 'Cash in Hand',
      icon: 'cashbook',
      value: cards.cashInHand.value,
      hint: cards.cashInHand.beforeOpening
        ? 'Before the opening cash date'
        : `As of ${formatReceiptDate(`${cards.cashInHand.asOf}T12:00:00`)}`,
    },
    {
      title: 'Total Bank Balance',
      icon: 'bank',
      value: cards.bankBalance.value,
      hint:
        cards.bankBalance.accountCount === 0
          ? 'No bank accounts added'
          : `${cards.bankBalance.activeCount} of ${countLabel(
              cards.bankBalance.accountCount,
              'account',
              'accounts',
            )} active`,
    },
    {
      title: 'Party Receivable',
      icon: 'parties',
      value: cards.partyReceivable.value,
      hint:
        cards.partyReceivable.partyCount === 0
          ? 'No outstanding balances'
          : `${countLabel(cards.partyReceivable.partyCount, 'party has', 'parties have')} dues`,
    },
    {
      title: 'Muri Stock',
      icon: 'stock',
      value: cards.muriStock.value,
      formatValue: (value) => `${formatQuantity(value)} ${cards.muriStock.unit}`,
      hint: cards.muriStock.openingRecorded
        ? `${formatQuantity(cards.muriStock.bags)} bags · minimum ${formatQuantity(
            cards.muriStock.lowStockThreshold,
          )} ${cards.muriStock.unit}`
        : 'Opening stock not recorded',
    },
    {
      title: cards.production.label,
      icon: 'production',
      value: cards.production.value,
      formatValue: (value) => `${formatQuantity(value)} ${cards.production.unit}`,
      hint: `${countLabel(cards.production.batches, 'batch', 'batches')} · average yield ${
        cards.production.averageYield === null
          ? '—'
          : `${Number(cards.production.averageYield).toFixed(2)}%`
      }`,
    },
    {
      title: 'Loan Outstanding',
      icon: 'loans',
      value: cards.loanOutstanding.value,
      hint: cards.loanOutstanding.tracked
        ? 'Tracked from the loan ledger'
        : 'Not tracked in this release',
    },
  ];

  const topCategoryMax = Math.max(
    ...expenses.topCategories.map((category) => Number(category.amount) || 0),
    1,
  );

  const flowInItems = [
    { label: 'Cash sales', value: flow.components.cashSales },
    { label: 'Party collections', value: flow.components.collections },
    { label: 'Other cash in', value: flow.components.otherIncome },
  ];
  const flowOutItems = [
    { label: 'Expenses', value: flow.components.expenses },
    { label: 'Staff payments', value: flow.components.staffPayments },
    { label: 'Loan payments', value: flow.components.loanPayments },
    { label: 'Other cash out', value: flow.components.otherOutflows },
  ];

  return (
    <div className="space-y-6">
      {header}

      {loadError ? (
        <section role="alert" className="card border-red-200 bg-red-50/70 p-4">
          <p className="text-sm font-semibold text-red-800">{loadError}</p>
          <p className="mt-1 text-xs text-red-700">Showing the last figures that loaded.</p>
        </section>
      ) : null}

      {stock?.openingRecorded && stock.lowStock ? (
        <section role="alert" className="card border-red-200 bg-red-50/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-red-800">Low stock warning</h2>
              <p className="mt-1 text-sm text-red-700">
                {stock.productName} is below the minimum of{' '}
                {formatQuantity(stock.lowStockThreshold)} {stock.unit}. Current stock:{' '}
                {formatQuantity(stock.quantity)} {stock.unit}.
              </p>
            </div>
            <Link
              to="/stock"
              className="btn-secondary shrink-0 border-red-200 text-red-800 hover:bg-red-100"
            >
              Open stock
            </Link>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-700">
            Business position
          </h2>
          <p className="text-xs text-ink-400">{dashboard.range.label}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <SectionCard
        title="Sales"
        description="Retail bills and wholesale invoices are billed sales. Credit invoices count here, but only receipts move cash."
        action={
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
          >
            Open reports
            <NavIcon name="arrowRight" className="h-4 w-4" />
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Retail sales"
            value={formatINR(sales.retail)}
            hint={countLabel(sales.retailCount, 'bill', 'bills')}
          />
          <Metric
            label="Wholesale sales"
            value={formatINR(sales.wholesale)}
            hint={`${countLabel(sales.wholesaleCount, 'invoice', 'invoices')} · ${formatINR(
              sales.wholesaleDue,
            )} due`}
          />
          <Metric
            label="Total sales"
            value={formatINR(sales.total)}
            hint={`${countLabel(sales.count, 'bill', 'bills')} in range`}
          />
        </div>
        <div className="mt-5">
          <SalesChart points={sales.series.points} bucket={sales.series.bucket} />
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Monthly sales"
          description="Current month compared with the previous month."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label={months.current.label}
              value={formatINR(months.current.total)}
              hint={`${countLabel(months.current.count, 'bill', 'bills')} this month`}
            />
            <Metric
              label={months.previous.label}
              value={formatINR(months.previous.total)}
              hint={`${countLabel(months.previous.count, 'bill', 'bills')} last month`}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-[11px] uppercase tracking-[0.08em] text-ink-400">
                  <th scope="col" className="py-2 pr-2 font-semibold">Month</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Retail</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Wholesale</th>
                  <th scope="col" className="py-2 pl-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {[months.current, months.previous].map((month) => (
                  <tr key={month.key} className="text-ink-700">
                    <td className="py-2 pr-2 font-medium text-ink-900">{month.label}</td>
                    <td className="px-2 py-2 text-right">{formatINR(month.retail)}</td>
                    <td className="px-2 py-2 text-right">{formatINR(month.wholesale)}</td>
                    <td className="py-2 pl-2 text-right font-semibold text-ink-900">
                      {formatINR(month.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`pill border ${
                months.change.amount >= 0
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50'
              } ${changeTone}`}
            >
              {signedINR(months.change.amount)}
            </span>
            <span className="text-ink-500">{comparisonText}</span>
          </div>
        </SectionCard>

        <SectionCard
          title="Expenses"
          description="Recorded costs. Expenses are never counted as sales."
          action={
            <Link
              to="/expenses"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              Open expenses
              <NavIcon name="arrowRight" className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Today's expenses"
              value={formatINR(expenses.today.total)}
              hint={`${countLabel(expenses.today.count, 'entry', 'entries')} · cash ${formatINR(
                expenses.today.cash,
              )}`}
            />
            <Metric
              label="Monthly expenses"
              value={formatINR(expenses.month.total)}
              hint={`${countLabel(expenses.month.count, 'entry', 'entries')} · bank ${formatINR(
                expenses.month.bank,
              )}`}
            />
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              Top expense categories this month
            </p>
            {expenses.topCategories.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-cream-300 bg-cream-50/60 px-3 py-4 text-xs text-ink-400">
                No expenses recorded this month.
              </p>
            ) : (
              <ul className="mt-2 space-y-2.5">
                {expenses.topCategories.map((category) => (
                  <li key={`${category.key}-${category.name}`} className="text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-ink-700">{category.name}</span>
                      <span className="text-ink-500">
                        {formatINR(category.amount)} · {countLabel(category.count, 'entry', 'entries')}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-200">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.max(
                            (Number(category.amount) / topCategoryMax) * 100,
                            4,
                          )}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Cash flow"
          description="Only cash receipts and cash payments move this figure. Credit sales do not."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Cash inflow"
              value={formatINR(flow.inflow)}
              tone="text-emerald-700"
            />
            <Metric label="Cash outflow" value={formatINR(flow.outflow)} tone="text-red-600" />
            <Metric
              label="Net movement"
              value={signedINR(flow.net)}
              tone={flow.net >= 0 ? 'text-emerald-700' : 'text-red-600'}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FlowList
              title="Money in"
              total={flow.inflow}
              items={flowInItems}
              tone="text-emerald-700"
            />
            <FlowList
              title="Money out"
              total={flow.outflow}
              items={flowOutItems}
              tone="text-red-600"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Receivables"
          description="Party balances from opening balances, invoices, invoice receipts and later payments."
          action={
            <Link
              to="/receivables"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              View all
              <NavIcon name="arrowRight" className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Total outstanding"
              value={formatINR(receivables.total)}
              hint="As of today"
            />
            <Metric
              label="Parties owing money"
              value={String(receivables.partyCount)}
              hint="Sorted by highest balance"
            />
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              Top outstanding parties
            </p>
            {receivables.topParties.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-cream-300 bg-cream-50/60 px-3 py-4 text-xs text-ink-400">
                No party owes money right now.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-cream-200">
                {receivables.topParties.map((party) => (
                  <li key={party.partyId}>
                    <Link
                      to={`/parties/${party.partyId}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-brand-700"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink-900">
                          {party.name}
                        </span>
                        <span className="block text-xs text-ink-400">
                          {party.phone || 'No phone'}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-ink-900">
                        {formatINR(party.outstanding)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Production"
          description="Finished Muri and yield from production batches in the selected range."
          action={
            <Link
              to="/production"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              Open production
              <NavIcon name="arrowRight" className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Production quantity"
              value={`${formatQuantity(production.finishedKg)} ${cards.production.unit}`}
              hint={countLabel(production.batches, 'batch', 'batches')}
            />
            <Metric
              label="Average yield"
              value={
                production.averageYield === null
                  ? '—'
                  : `${Number(production.averageYield).toFixed(2)}%`
              }
              hint="Finished Muri ÷ raw material × 100"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric
              label="Raw material"
              value={`${formatQuantity(production.rawMaterialKg)} ${cards.production.unit}`}
            />
            <Metric
              label="Wastage"
              value={`${formatQuantity(production.wastageKg)} ${cards.production.unit}`}
            />
            <Metric label="Production cost" value={formatINR(production.productionCost)} />
          </div>
        </SectionCard>

        <SectionCard
          title="Stock"
          description="Current stock balance from opening stock, production, purchases and sales."
          action={
            <Link
              to="/stock"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
            >
              Open stock
              <NavIcon name="arrowRight" className="h-4 w-4" />
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Current Muri stock"
              value={`${formatQuantity(stock?.quantity ?? 0)} ${stock?.unit ?? 'KG'}`}
            />
            <Metric
              label="Bags"
              value={formatQuantity(stock?.bags ?? 0)}
              hint="At the configured bag weight"
            />
            <Metric
              label="Low-stock minimum"
              value={`${formatQuantity(stock?.lowStockThreshold ?? 0)} ${stock?.unit ?? 'KG'}`}
              hint={stock?.openingRecorded ? 'From business settings' : 'Opening stock not recorded'}
            />
          </div>
          <div
            className={`mt-4 rounded-lg border px-3.5 py-3 text-xs leading-relaxed ${
              stock?.openingRecorded && stock.lowStock
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-cream-200 bg-cream-50/70 text-ink-500'
            }`}
          >
            {stock?.openingRecorded
              ? stock.lowStock
                ? `Low stock: ${stock.productName} is below the minimum of ${formatQuantity(
                    stock.lowStockThreshold,
                  )} ${stock.unit}.`
                : `${stock?.productName ?? 'Muri'} stock is above the low-stock minimum.`
              : 'Record opening stock to start stock and low-stock tracking.'}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Accounting rules"
          description="Each figure is kept separate, so adding one kind of transaction never inflates another."
          className="lg:col-span-2"
        >
          <dl className="grid gap-2 sm:grid-cols-2">
            {ACCOUNTING_RULES.map(([term, explanation]) => (
              <div
                key={term}
                className="rounded-lg border border-cream-200 bg-cream-50/60 px-3.5 py-3"
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-700">
                  {term}
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-ink-500">{explanation}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-4 space-y-1.5 border-t border-cream-200 pt-3 text-xs leading-relaxed text-ink-500">
            <li>{dashboard.notes.salesBasis}</li>
            <li>Party payments are collections. They are never counted as a new sale.</li>
            <li>{dashboard.notes.loanOutstanding}</li>
          </ul>
        </SectionCard>

        <SectionCard title="Quick access" description="Jump to a module.">
          <div className="grid gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-3 rounded-lg border border-cream-200 bg-cream-50/60 px-3.5 py-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-cream-200">
                  <NavIcon name={link.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">{link.label}</span>
                  <span className="block truncate text-xs text-ink-500">{link.description}</span>
                </span>
                <NavIcon
                  name="arrowRight"
                  className="h-4 w-4 shrink-0 text-ink-400 transition-colors group-hover:text-brand-600"
                />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default DashboardPage;
