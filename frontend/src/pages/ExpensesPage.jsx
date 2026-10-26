import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import CancelTransactionDialog from '../components/CancelTransactionDialog';
import ExpenseFormDialog from '../components/ExpenseFormDialog';
import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { cancelExpenseApi } from '../services/cancelService';
import { getExpenseCategoriesApi, getExpensesApi } from '../services/expenseService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, formatReceiptDate } from '../utils/format';

const METHOD_LABELS = { cash: 'Cash', upi: 'UPI', bank: 'Bank' };

const ExpensesPage = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getExpenseCategoriesApi()
      .then((data) => {
        if (isMounted) {
          setCategories(Array.isArray(data.categories) ? data.categories : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCategories([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (fromDate && toDate && fromDate > toDate) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      getExpensesApi({
        search: search.trim() || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
        .then((data) => {
          if (!isMounted) {
            return;
          }

          setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
          setSummary(data.summary ?? null);
          setLoadError('');
        })
        .catch((error) => {
          if (isMounted) {
            setLoadError(getApiErrorMessage(error, 'Unable to load expenses.'));
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
  }, [search, categoryFilter, fromDate, toDate, refreshToken]);

  const hasFilters = Boolean(
    search.trim() || categoryFilter !== 'all' || fromDate || toDate,
  );
  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

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
    setCategoryFilter('all');
    setFromDate('');
    setToDate('');
  };

  const handleCategoryAdded = (category) => {
    setCategories((previous) => [...previous, category]);
  };

  const handleSaved = () => {
    setIsFormOpen(false);
    refresh();
  };

  const handleCancelExpense = async (reason) => {
    if (!cancelTarget) {
      return;
    }

    setIsCancelling(true);

    try {
      const data = await cancelExpenseApi(cancelTarget._id, reason);
      toast.success(data.message ?? 'Expense cancelled.');
      setCancelTarget(null);
      refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to cancel the expense.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const entryCount = summary?.count ?? 0;

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Record day-to-day mill costs against an expense category. Cash expenses reduce the cash book; UPI and bank expenses are tracked against the bank account."
        actions={
          <button type="button" className="btn-primary" onClick={() => setIsFormOpen(true)}>
            Add expense
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total expenses"
          icon="expenses"
          value={summary?.total ?? null}
          formatValue={formatINR2}
          hint="For the selected filters"
        />
        <StatCard
          title="Paid from cash"
          icon="cashbook"
          value={summary?.cash ?? null}
          formatValue={formatINR2}
          hint="Reduces cash in hand"
        />
        <StatCard
          title="Paid from bank"
          icon="bank"
          value={summary?.bank ?? null}
          formatValue={formatINR2}
          hint="UPI and bank payments"
        />
        <StatCard
          title="Expense entries"
          icon="reports"
          value={summary ? entryCount : null}
          formatValue={(value) => String(value)}
          hint={entryCount === 1 ? '1 entry recorded' : `${entryCount} entries recorded`}
        />
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-cream-200 bg-cream-50/60 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(150px,0.7fr)_minmax(140px,0.6fr)_minmax(140px,0.6fr)_auto] sm:items-end">
            <FormField label="Search" htmlFor="expense-search">
              <input
                id="expense-search"
                type="search"
                className="field-input"
                placeholder="Number, category, description"
                value={search}
                onChange={(event) => resetAndSet(setSearch, event.target.value)}
              />
            </FormField>
            <FormField label="Category" htmlFor="expense-category-filter">
              <select
                id="expense-category-filter"
                className="field-input"
                value={categoryFilter}
                onChange={(event) => resetAndSet(setCategoryFilter, event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category.nameKey}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="From" htmlFor="expense-from">
              <input
                id="expense-from"
                type="date"
                className="field-input"
                value={fromDate}
                onChange={(event) => resetAndSet(setFromDate, event.target.value)}
              />
            </FormField>
            <FormField label="To" htmlFor="expense-to">
              <input
                id="expense-to"
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
            Loading expenses...
          </div>
        ) : loadError ? (
          <div className="px-5 py-10">
            <h2 className="text-base font-semibold text-ink-900">Expenses could not be loaded</h2>
            <p className="mt-1 text-sm text-ink-500">{loadError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="expenses" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink-900">
              {hasFilters ? 'No matching expenses' : 'No expenses recorded yet'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              {hasFilters
                ? 'Try a different search term, category or date range.'
                : 'Record electricity, fuel, rent, salary and other mill costs here.'}
            </p>
            {hasFilters ? (
              <button type="button" className="btn-secondary mt-4" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button type="button" className="btn-primary mt-4" onClick={() => setIsFormOpen(true)}>
                Add expense
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
                      Expense no.
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Category
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Description
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Paid via
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Amount
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {expenses.map((expense) => (
                    <tr key={expense._id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-700">
                        {formatReceiptDate(expense.expenseDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink-900">
                        {expense.expenseNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="pill bg-brand-50 text-brand-700">{expense.category}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="max-w-[320px] font-medium text-ink-900">
                          {expense.description}
                        </p>
                        {expense.notes ? (
                          <p className="mt-0.5 max-w-[320px] truncate text-xs text-ink-400">
                            {expense.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span className="pill bg-cream-100 text-ink-700">
                          {METHOD_LABELS[expense.paymentMethod] ?? expense.paymentMethod}
                        </span>
                        <p className="mt-1 text-[11px] text-ink-400">
                          {expense.account === 'cash' ? 'Cash account' : 'Bank account'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-ink-900">
                        {formatINR2(expense.amount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <button
                          type="button"
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                          onClick={() => setCancelTarget(expense)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400">
              Showing up to 200 expenses. Summary figures cover every expense matching the current
              filters. Cancelled expenses stay in the audit trail.
            </p>
          </>
        )}
      </section>

      {isFormOpen ? (
        <ExpenseFormDialog
          categories={categories}
          onCategoryAdded={handleCategoryAdded}
          onClose={() => setIsFormOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {cancelTarget ? (
        <CancelTransactionDialog
          title={`Cancel expense ${cancelTarget.expenseNumber}?`}
          description={`${formatINR2(cancelTarget.amount)} will be removed from the cash and bank books, and this expense will be marked CANCELLED in the audit trail. This cannot be undone.`}
          confirmText="Cancel expense"
          isSaving={isCancelling}
          onConfirm={handleCancelExpense}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </div>
  );
};

export default ExpensesPage;
