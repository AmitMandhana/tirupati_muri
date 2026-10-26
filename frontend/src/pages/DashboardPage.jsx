import { Link } from 'react-router-dom';

import Logo from '../components/Logo';
import NavIcon from '../components/NavIcon';
import StatCard from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { formatLongDate } from '../utils/format';

const todayStats = [
  { title: "Today's Sales", icon: 'billing', hint: 'No sales recorded today' },
  { title: "Today's Expenses", icon: 'expenses', hint: 'No expenses recorded today' },
  { title: 'Cash in Hand', icon: 'cashbook', hint: 'Cash book not started' },
  { title: 'Bank Balance', icon: 'bank', hint: 'No bank accounts added' },
];

const businessStats = [
  { title: 'Party Receivable', icon: 'parties', hint: 'No party balances yet' },
  { title: 'Muri Stock', icon: 'stock', hint: 'Stock module not started' },
  { title: 'Monthly Sales', icon: 'reports', hint: 'No sales this month' },
  { title: 'Loan Outstanding', icon: 'loans', hint: 'No loans recorded' },
];

const quickLinks = [
  { to: '/retail-billing', label: 'Retail Billing', icon: 'billing', description: 'Counter sales' },
  { to: '/parties', label: 'Parties', icon: 'parties', description: 'Customers & suppliers' },
  { to: '/stock', label: 'Stock', icon: 'stock', description: 'Paddy & muri' },
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
              Welcome back{firstName ? `, ${firstName}` : ''}. This is the foundation release. The
              dashboard figures below will fill in as billing, stock and accounting modules are
              added.
            </p>
          </div>
          <div className="hidden shrink-0 sm:block">
            <Logo className="h-16 w-16" />
          </div>
        </div>
      </section>

      <section>
        <SectionHeading
          title="Today"
          description="Figures will appear once billing and expenses are enabled."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {todayStats.map((stat) => (
            <StatCard key={stat.title} {...stat} value={0} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Business position"
          description="Stock and account balances will appear in later phases."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {businessStats.map((stat) => (
            <StatCard key={stat.title} {...stat} value={0} />
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
            Foundation release
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">What is included now</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Sign-in, business settings and the application layout are ready. Billing, stock,
            production, staff, loan and reporting modules will be added step by step.
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
