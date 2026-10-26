import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Logo from '../components/Logo';
import NavIcon from '../components/NavIcon';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { getBankAccountsApi } from '../services/bankAccountService';
import { getCashBookSummaryApi } from '../services/cashBookService';
import { getReceivablesApi } from '../services/partyService';
import { getProductionSummaryApi } from '../services/productionService';
import { getSalesSummaryApi } from '../services/saleService';
import { getStaffSummaryApi } from '../services/staffService';
import { getStockOverviewApi } from '../services/stockService';
import {
  formatINR,
  formatLongDate,
  formatQuantity,
  formatReceiptDate,
} from '../utils/format';

const quickLinks = [
  { to: '/retail-billing', label: 'Retail Billing', icon: 'billing', description: 'Counter sales' },
  { to: '/cash-book', label: 'Cash Book', icon: 'cashbook', description: 'Daily cash position' },
  {
    to: '/bank-accounts',
    label: 'Bank Accounts',
    icon: 'bank',
    description: 'Balances & transfers',
  },
  { to: '/expenses', label: 'Expenses', icon: 'expenses', description: 'Costs & categories' },
  { to: '/stock', label: 'Stock', icon: 'stock', description: 'Balance & ledger' },
  {
    to: '/production',
    label: 'Production',
    icon: 'production',
    description: 'Batches & yield',
  },
  { to: '/staff', label: 'Staff', icon: 'staff', description: 'Salaries & advances' },
  { to: '/parties', label: 'Parties', icon: 'parties', description: 'Accounts & ledgers' },
  {
    to: '/receivables',
    label: 'Receivables',
    icon: 'loans',
    description: 'Outstanding & reminders',
  },
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
  const [receivables, setReceivables] = useState(null);
  const [receivablesFailed, setReceivablesFailed] = useState(false);
  const [cash, setCash] = useState(null);
  const [cashFailed, setCashFailed] = useState(false);
  const [bank, setBank] = useState(null);
  const [bankFailed, setBankFailed] = useState(false);
  const [production, setProduction] = useState(null);
  const [productionFailed, setProductionFailed] = useState(false);
  const [staff, setStaff] = useState(null);
  const [staffFailed, setStaffFailed] = useState(false);

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

  useEffect(() => {
    let isMounted = true;

    getReceivablesApi()
      .then((data) => {
        if (isMounted) {
          setReceivables(data.summary ?? null);
          setReceivablesFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReceivablesFailed(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCashBookSummaryApi()
      .then((data) => {
        if (isMounted) {
          setCash(data.summary ?? null);
          setCashFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCashFailed(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getBankAccountsApi()
      .then((data) => {
        if (isMounted) {
          setBank(data.summary ?? null);
          setBankFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBankFailed(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getProductionSummaryApi()
      .then((data) => {
        if (isMounted) {
          setProduction(data.summary ?? null);
          setProductionFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProductionFailed(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getStaffSummaryApi()
      .then((data) => {
        if (isMounted) {
          setStaff(data.summary ?? null);
          setStaffFailed(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStaffFailed(true);
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

  const todayExpensesHint = cashFailed
    ? 'Expense summary unavailable'
    : !cash
      ? "Loading today's expenses..."
      : cash.todayExpenses.count > 0
        ? `${cash.todayExpenses.count} ${
            cash.todayExpenses.count === 1 ? 'entry' : 'entries'
          } · ${formatINR(cash.todayExpenses.cash)} cash`
        : 'No expenses recorded today';

  const cashInHandHint = cashFailed
    ? 'Cash summary unavailable'
    : !cash
      ? 'Loading cash in hand...'
      : cash.beforeOpening
        ? 'Before the opening cash date'
        : `Opening ${formatINR(cash.openingCash)} · ${formatINR(cash.cashSales)} cash sales today`;

  const bankBalanceHint = bankFailed
    ? 'Bank summary unavailable'
    : !bank
      ? 'Loading bank balance...'
      : bank.accountCount === 0
        ? 'No bank accounts added'
        : `${bank.activeCount} of ${bank.accountCount} ${
            bank.accountCount === 1 ? 'account' : 'accounts'
          } active`;

  const productionBatchLabel = (count) => `${count} ${count === 1 ? 'batch' : 'batches'}`;
  const productionTodayHint = productionFailed
    ? 'Production summary unavailable'
    : !production
      ? "Loading today's production..."
      : production.today.count > 0
        ? `${productionBatchLabel(production.today.count)} today`
        : 'No production today';
  const productionMonthHint = productionFailed
    ? 'Production summary unavailable'
    : !production
      ? "Loading this month's production..."
      : production.month.count > 0
        ? `${productionBatchLabel(production.month.count)} this month`
        : 'No production this month';
  const currentYieldHint = productionFailed
    ? 'Production summary unavailable'
    : !production
      ? 'Loading current yield...'
      : production.currentYieldPercent === null
        ? 'No production recorded yet'
        : `${production.latestProduction.productionNumber} · ${formatReceiptDate(
            production.latestProduction.productionDate,
          )}`;

  const productionStats = [    {
      title: "Today's Production",
      icon: 'production',
      hint: productionTodayHint,
      value: production ? production.today.finishedKg : null,
      formatValue: (value) => `${formatQuantity(value)} KG`,
    },
    {
      title: 'Monthly Production',
      icon: 'reports',
      hint: productionMonthHint,
      value: production ? production.month.finishedKg : null,
      formatValue: (value) => `${formatQuantity(value)} KG`,
    },
    {
      title: 'Current Production Yield',
      icon: 'reports',
      hint: currentYieldHint,
      value: production ? production.currentYieldPercent : null,
      formatValue: (value) => `${Number(value).toFixed(2)}%`,
    },
  ];

  const staffPaymentLabel = (count) => `${count} ${count === 1 ? 'payment' : 'payments'}`;
  const staffTodayHint = staffFailed
    ? 'Staff summary unavailable'
    : !staff
      ? "Loading today's staff payments..."
      : staff.todayPayments.count > 0
        ? `${staffPaymentLabel(staff.todayPayments.count)} · ${formatINR(
            staff.todayPayments.cash,
          )} cash`
        : 'No staff payments today';
  const staffMonthHint = staffFailed
    ? 'Staff summary unavailable'
    : !staff
      ? 'Loading monthly salary expense...'
      : staff.monthlySalaryCount > 0
        ? `${staff.monthlySalaryCount} salary ${
            staff.monthlySalaryCount === 1 ? 'entry' : 'entries'
          } · ${staff.salaryMonthLabel}`
        : `No salary recorded for ${staff.salaryMonthLabel}`;

  const staffStats = [
    {
      title: "Today's Staff Payments",
      icon: 'staff',
      hint: staffTodayHint,
      value: staff ? staff.todayPayments.total : null,
    },
    {
      title: 'Monthly Salary Expense',
      icon: 'reports',
      hint: staffMonthHint,
      value: staff ? staff.monthlySalaryExpense : null,
    },
  ];

  const todayStats = [
    {
      title: "Today's Sales",
      icon: 'billing',
      hint: todaySalesHint,
      value: summary ? today.total : null,
    },
    {
      title: "Today's Expenses",
      icon: 'expenses',
      hint: todayExpensesHint,
      value: cash ? cash.todayExpenses.total : null,
    },
    {
      title: 'Cash in Hand',
      icon: 'cashbook',
      hint: cashInHandHint,
      value: cash ? cash.cashInHand : null,
    },
    {
      title: 'Bank Balance',
      icon: 'bank',
      hint: bankBalanceHint,
      value: bank ? bank.totalBalance : null,
    },
  ];

  const receivablesHint = receivablesFailed
    ? 'Receivable summary unavailable'
    : !receivables
      ? 'Loading receivables...'
      : receivables.partyCount > 0
        ? `${receivables.partyCount} ${receivables.partyCount === 1 ? 'party has' : 'parties have'} dues`
        : 'No outstanding balances';

  const businessStats = [
    {
      title: 'Party Receivable',
      icon: 'parties',
      hint: receivablesHint,
      value: receivables ? receivables.totalOutstanding : null,
    },
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
              Welcome back{firstName ? `, ${firstName}` : ''}. Retail billing, wholesale invoicing,
              stock, production, staff salaries, party credit, expenses, the daily cash book and
              bank accounts are live. Today&apos;s sales, expenses, cash in hand, bank balance,
              production, staff payments, Muri stock and party receivable below come from recorded
              bills, stock movements, production batches, salaries, invoices, receipts, payments and
              bank transactions.
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
          description="Bills, receipts and expenses update these figures automatically."
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
          description="Stock, sales and party receivables update from recorded transactions."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {businessStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Production"
          description="Finished Muri and yield from recorded production batches."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {productionStats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Staff"
          description="Salaries, advances and payments recorded in the staff ledgers."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {staffStats.map((stat) => (
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
            Billing, production, staff &amp; finance live
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">What is included now</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Sign-in, business settings, the product catalogue, retail billing, wholesale
            invoicing, stock tracking, production entry with yield calculation, staff salaries and
            advances, party ledgers, credit limits, payment receipts, receivables, expense
            management, the daily cash book and bank account management with transfers are ready.
            Loan management will be added step by step.
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
