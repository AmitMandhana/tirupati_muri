import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import StaffFormDialog from '../components/StaffFormDialog';
import { getStaffApi } from '../services/staffService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, formatReceiptDate } from '../utils/format';

const StaffPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [staff, setStaff] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [formStaff, setFormStaff] = useState(undefined);

  useEffect(() => {
    let isMounted = true;

    const timer = window.setTimeout(() => {
      const params = { search: search.trim() || undefined };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      getStaffApi(params)
        .then((data) => {
          if (!isMounted) {
            return;
          }

          setStaff(Array.isArray(data.staff) ? data.staff : []);
          setSummary(data.summary ?? null);
          setLoadError('');
        })
        .catch((error) => {
          if (isMounted) {
            setLoadError(getApiErrorMessage(error, 'Unable to load staff.'));
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
  }, [search, statusFilter, refreshToken]);

  const hasFilters = Boolean(search.trim() || statusFilter !== 'all');

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

  const handleStatusChange = (event) => {
    setIsLoading(true);
    setLoadError('');
    setStatusFilter(event.target.value);
  };

  const clearFilters = () => {
    if (!hasFilters) {
      return;
    }

    setIsLoading(true);
    setLoadError('');
    setSearch('');
    setStatusFilter('all');
  };

  const handleSaved = () => {
    setFormStaff(undefined);
    refresh();
  };

  const activeHint = summary
    ? `${summary.staffCount} ${summary.staffCount === 1 ? 'member' : 'members'} on record`
    : 'Loading staff list...';
  const payrollHint = summary
    ? `Active staff monthly salaries`
    : 'Loading monthly payroll...';
  const payableHint = summary
    ? summary.totalPayable > 0
      ? 'Across all staff ledgers'
      : 'All staff balances are settled'
    : 'Loading staff payable...';

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage staff records and monthly salary. Each member has a ledger for salary, advances, bonuses, deductions, recoveries and payments."
        actions={
          <button type="button" className="btn-primary" onClick={() => setFormStaff(null)}>
            Add staff member
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Active staff"
          icon="staff"
          value={summary ? summary.activeCount : null}
          formatValue={(value) => String(value)}
          hint={activeHint}
        />
        <StatCard
          title="Monthly payroll"
          icon="reports"
          value={summary ? summary.monthlyPayroll : null}
          hint={payrollHint}
        />
        <StatCard
          title="Remaining payable"
          icon="cashbook"
          value={summary ? summary.totalPayable : null}
          hint={payableHint}
        />
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-cream-200 bg-cream-50/60 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(160px,0.6fr)_auto] sm:items-end">
            <FormField label="Search" htmlFor="staff-search">
              <input
                id="staff-search"
                type="search"
                className="field-input"
                placeholder="Name, phone or role"
                value={search}
                onChange={handleSearchChange}
              />
            </FormField>
            <FormField label="Status" htmlFor="staff-status-filter">
              <select
                id="staff-status-filter"
                className="field-input"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="all">All staff</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
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

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-ink-500">
            <Spinner className="h-4 w-4 text-brand-600" />
            Loading staff...
          </div>
        ) : loadError ? (
          <div className="px-5 py-10">
            <h2 className="text-base font-semibold text-ink-900">Staff could not be loaded</h2>
            <p className="mt-1 text-sm text-ink-500">{loadError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="staff" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink-900">
              {hasFilters ? 'No matching staff' : 'No staff members yet'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              {hasFilters
                ? 'Try a different search term or status filter.'
                : 'Add your first staff member to record salaries, advances and payments.'}
            </p>
            {hasFilters ? (
              <button type="button" className="btn-secondary mt-4" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => setFormStaff(null)}
              >
                Add staff member
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                  <tr className="border-b border-cream-200">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Staff
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Phone
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Joined
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Monthly salary
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Remaining payable
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {staff.map((member) => {
                    const remaining = Number(member.totals?.remainingPayable ?? 0);

                    return (
                      <tr key={member._id} className="align-top">
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/staff/${member._id}`}
                            className="font-semibold text-ink-900 hover:text-brand-700"
                          >
                            {member.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-ink-400">{member.role}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                          {member.phone}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                          {formatReceiptDate(member.joiningDate)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-ink-700">
                          {formatINR2(member.monthlySalary)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold ${
                            remaining < -0.005 ? 'text-emerald-700' : 'text-ink-900'
                          }`}
                        >
                          {remaining < -0.005
                            ? `Advance ${formatINR2(Math.abs(remaining))}`
                            : formatINR2(remaining)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`pill ${
                              member.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-cream-100 text-ink-500'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                member.status === 'active' ? 'bg-emerald-500' : 'bg-ink-400'
                              }`}
                              aria-hidden="true"
                            />
                            {member.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/staff/${member._id}`}
                              className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                            >
                              Ledger
                            </Link>
                            <button
                              type="button"
                              className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                              onClick={() => setFormStaff(member)}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400">
              Showing up to 200 staff members. Open a member to see the full salary ledger and
              record entries.
            </p>
          </>
        )}
      </section>

      {formStaff !== undefined ? (
        <StaffFormDialog
          staff={formStaff}
          onClose={() => setFormStaff(undefined)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
};

export default StaffPage;
