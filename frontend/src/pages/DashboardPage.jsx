import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Logo from '../components/Logo';
import NavIcon from '../components/NavIcon';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { getSalesSummaryApi } from '../services/saleService';
import { getStockOverviewApi } from '../services/stockService';
import { formatLongDate, formatQuantity } from '../utils/format';

const quickLinks = [
  { to: '/retail-billing', label: 'Retail Billing', icon: 'billing', description: 'Counter sales' },
  { to: '/stock', label: 'Stock', icon: 'stock', description: 'Balance & ledger' },
  { to: '/parties', label: 'Parties', icon: 'parties', description: 'Customers & suppliers' },
  { to: '/reports', label: 'Reports', icon: 'reports', description: 'Business summaries' },
];

const SectionHeading = ({ title, description }) => (
  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-700">{title}</h2>
    <p className="text-xs text-ink-400">{description}</p>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const { settings } = useBusinessSettings();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const [summary, setSummary] = useState(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [stock, setStock] = useState(null);
  const [stockFailed, setStockFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getSalesSummaryApi()
      .then((data) => {
        if (isMounted) {
          setSummary(data.summary);
          setSummaryFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSummaryFailed(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getStockOverviewApi()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(data.stocks) ? data.stocks : [];
        const muri =
          items.find((item) => item.productName.trim().toLowerCase() === 'muri') ??
          items.find((item) => item.active) ??
          items[0] ??
          null;

        setStock(muri);
        setStockFailed(false);
      })
      .catch(() => {
        if (isMounted) {
          setStockFailed(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const unit = stock?.unit ?? 'KG';
  const stockHint = stockFailed
    ? 'Stock unavailable'
    : !stock
      ? 'Loading stock...'
      : !stock.openingRecorded
        ? 'Opening stock not recorded'
        : `${formatQuantity(stock.bags)} bags · minimum ${formatQuantity(stock.lowStockThreshold)} ${unit}`;

  const today = summary?.today;
  const month = summary?.month;
  const billCount = (count) => `${count} ${count === 1 ? 'bill' : 'bills'}`;

  const todaySalesHint = summaryFailed
    ? 'Sales summary unavailable'
    : !summary
      ? "Loading today's sales..."
      : today.count > 0
        ? `${billCount(today.count)} today`
        : 'No sales recorded today';

  const monthlySalesHint = summaryFailed
    ? 'Sales summary unavailable'
    : !summary
      ? "Loading this month's sales..."
      : month.count > 0
        ? `${billCount(month.count)} this month`
        : 'No sales this month';

  const todayStats = [
    {
      title: "Today's Sales",
      icon: 'billing',
      hint: todaySalesHint,
      value: summary ? today.total : null,
    },
    { title: "Today's Expenses", icon: 'expenses', hint: 'No expenses recorded today', value: 0 },
    { title: 'Cash in Hand', icon: 'cashbook', hint: 'Cash book not started', value: 0 },
    { title: 'Bank Balance', icon: 'bank', hint: 'No bank accounts added', value: 0 },
  ];

  const businessStats = [
    { title: 'Party Receivable', icon: 'parties', hint: 'No party balances yet', value: 0 },
    {
      title: 'Muri Stock',
      icon: 'stock',
      hint: stockHint,
      value: stock ? stock.quantity : null,
      formatValue: (value) => `${formatQuantity(value)} ${unit}`,
    },
    {
      title: 'Monthly Sales',
      icon: 'reports',
      hint: monthlySalesHint,
      value: summary ? month.total : null,
    },
    { title: 'Loan Outstanding', icon: 'loans', hint: 'No loans recorded', value: 0 },
  ];

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              {formatLongDate(new Date())}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              {settings.businessName}
            </h1>
            <p className="mt-1 text-sm font-medium text-ink-500">Business Management System</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-500">
              Welcome back{firstName ? `, ${firstName}` : ''}. Retail billing, wholesale invoicing
              and stock are live. Today&apos;s retail sales and Muri stock below come from recorded
              bills and stock transactions; wholesale totals are on the Wholesale page.
              Accounting figures will fill in as later modules are added.
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Logo className="h-16 w-16" />
          </div>
        </div>
      </section>

      {stock?.openingRecorded && stock.lowStock ? (
        <section role="alert" className="card border-red-200 bg-red-50/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-red-800">Low stock warning</h2>
              <p className="mt-1 text-sm text-red-700">
                {stock.productName} is below the minimum of{' '}
                {formatQuantity(stock.lowStockThreshold)} {unit}. Current stock:{' '}
                {formatQuantity(stock.quantity)} {unit}.
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
        <SectionHeading
          title="Today"
          description="Retail bills update these figures automatically."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {todayStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Business position"
          description="Stock and sales update from recorded transactions."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {businessStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-ink-900">Quick access</h2>
          <p className="mt-1 text-sm text-ink-500">
            Jump to a section of the application. New modules are clearly marked until they are
            built.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-3 rounded-lg border border-cream-200 bg-cream-50/60 px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-cream-200">
                  <NavIcon name={link.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">{link.label}</span>
                  <span className="block truncate text-xs text-ink-500">{link.description}</span>
                </span>
                <NavIcon
                  name="arrowRight"
                  className="h-4 w-4 text-ink-400 transition-colors group-hover:text-brand-600"
                />
              </Link>
            ))}
          </div>
        </section>

        <section className="card border-brand-100 bg-brand-50/50 p-6">
          <span className="pill border border-brand-200 bg-white uppercase tracking-[0.12em] text-brand-700">
            Billing &amp; stock live
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">What is included now</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Sign-in, business settings, the product catalogue, retail billing, wholesale
            invoicing and stock tracking are ready. Production, staff, loan and reporting modules
            will be added step by step.
          </p>
          <Link
            to="/settings"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
          >
            Update business settings
            <NavIcon name="arrowRight" className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
