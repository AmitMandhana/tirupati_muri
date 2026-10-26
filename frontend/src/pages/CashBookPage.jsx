import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import NavIcon from '../components/NavIcon';
import OpeningCashDialog from '../components/OpeningCashDialog';
import PageHeader from '../components/PageHeader';
import PhysicalCashDialog from '../components/PhysicalCashDialog';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import { getCashBookApi } from '../services/cashBookService';
import { getApiErrorMessage } from '../utils/errors';
import {
  addDaysToDateKey,
  formatDateKeyLong,
  formatINR2,
  formatReceiptDate,
  formatReceiptTime,
  toDateInputValue,
} from '../utils/format';

const SummaryRow = ({
  label,
  hint,
  value,
  negative = false,
  signed = false,
  emphasis = false,
  valueClass = '',
}) => {
  const amount = Number(value);
  const isNumber = value !== null && value !== undefined && Number.isFinite(amount);

  let prefix = '';

  if (isNumber) {
    if (amount < -0.004) {
      prefix = '− ';
    } else if (negative && Math.abs(amount) > 0.004) {
      prefix = '− ';
    } else if (signed && amount > 0.004) {
      prefix = '+ ';
    }
  }

  return (
    <div
      className={`flex items-baseline justify-between gap-4 px-5 py-3 ${
        emphasis ? 'bg-cream-50/70' : ''
      }`}
    >
      <div>
        <p className={`text-sm ${emphasis ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
          {label}
        </p>
        {hint ? <p className="mt-0.5 text-xs text-ink-400">{hint}</p> : null}
      </div>
      <p
        className={`whitespace-nowrap text-right ${
          emphasis ? 'text-base font-semibold' : 'text-sm font-medium'
        } ${valueClass || 'text-ink-900'}`}
      >
        {isNumber ? `${prefix}${formatINR2(Math.abs(amount))}` : '—'}
      </p>
    </div>
  );
};

const differenceClass = (value) => {
  const amount = Number(value) || 0;

  if (amount > 0.004) {
    return 'text-emerald-700';
  }

  if (amount < -0.004) {
    return 'text-red-700';
  }

  return 'text-ink-900';
};

const CashBookPage = () => {
  const todayKey = toDateInputValue();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [cashBook, setCashBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [isOpeningOpen, setIsOpeningOpen] = useState(false);
  const [isCountOpen, setIsCountOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getCashBookApi(selectedDate)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setCashBook(data);
        setLoadError('');
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load the cash book.'));
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
  }, [selectedDate, refreshToken]);

  const goToDate = (nextDate) => {
    if (!nextDate || nextDate > todayKey || nextDate === selectedDate) {
      return;
    }

    setIsLoading(true);
    setLoadError('');
    setSelectedDate(nextDate);
  };

  const shiftDate = (days) => {
    goToDate(addDaysToDateKey(selectedDate, days));
  };

  const refresh = () => {
    setIsLoading(true);
    setLoadError('');
    setRefreshToken((token) => token + 1);
  };

  const summary = cashBook?.summary ?? {
    openingCash: 0,
    cashSales: 0,
    partyCollections: 0,
    otherIncome: 0,
    expenses: 0,
    staffPayments: 0,
    loanPayments: 0,
    otherOutflows: 0,
    totalIn: 0,
    totalOut: 0,
    closingCash: 0,
  };

  const closing = cashBook?.closing ?? {
    openingCash: 0,
    cashSales: 0,
    cashCollections: 0,
    cashExpenses: 0,
    staffPayments: 0,
    otherCashTransactions: 0,
    expectedClosingCash: 0,
    physicalCash: null,
    difference: null,
    notes: '',
    reason: '',
    adjusted: false,
    countedAt: null,
    isCounted: false,
  };

  return (
    <div>
      <PageHeader
        title="Daily Cash Book"
        description="Daily closing with opening cash, cash sales, cash collections, cash expenses, staff payments and other cash transactions, compared with the physical cash counted. Credit sales never affect cash in hand."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsOpeningOpen(true)}
              disabled={isLoading && !cashBook}
            >
              Opening cash
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsCountOpen(true)}
              disabled={isLoading || !cashBook || cashBook.beforeOpening}
            >
              Daily closing
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Opening cash"
          icon="cashbook"
          value={cashBook?.beforeOpening ? 0 : summary.openingCash}
          formatValue={formatINR2}
          hint={
            cashBook?.beforeOpening
              ? 'Before the opening date'
              : cashBook?.opening?.balance > 0
                ? `Opening balance ${formatINR2(cashBook.opening.balance)}`
                : 'Starting cash balance'
          }
        />
        <StatCard
          title="Cash in"
          icon="billing"
          value={cashBook?.beforeOpening ? 0 : summary.totalIn}
          formatValue={formatINR2}
          hint="Cash sales, collections and other income"
        />
        <StatCard
          title="Cash out"
          icon="expenses"
          value={cashBook?.beforeOpening ? 0 : summary.totalOut}
          formatValue={formatINR2}
          hint="Expenses, staff, loans and other outflows"
        />
        <StatCard
          title="Closing cash"
          icon="reports"
          value={cashBook?.beforeOpening ? 0 : summary.closingCash}
          formatValue={formatINR2}
          hint="Expected cash in hand at day end"
        />
      </div>

      <section className="card mt-4 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary h-[42px] px-3"
            onClick={() => shiftDate(-1)}
            aria-label="Previous day"
          >
            ←
          </button>
          <input
            type="date"
            max={todayKey}
            value={selectedDate}
            onChange={(event) => goToDate(event.target.value)}
            className="field-input w-auto"
            aria-label="Cash book date"
          />
          <button
            type="button"
            className="btn-secondary h-[42px] px-3"
            onClick={() => shiftDate(1)}
            disabled={selectedDate >= todayKey}
            aria-label="Next day"
          >
            →
          </button>
          <button
            type="button"
            className="btn-secondary h-[42px]"
            onClick={() => goToDate(todayKey)}
            disabled={selectedDate === todayKey}
          >
            Today
          </button>
        </div>
        <p className="text-sm font-semibold text-ink-700">{formatDateKeyLong(selectedDate)}</p>
      </section>

      {cashBook?.beforeOpening ? (
        <section className="card mt-4 border-brand-100 bg-brand-50/60 p-5">
          <h2 className="text-base font-semibold text-ink-900">
            This date is before the opening date
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            Opening cash starts on {formatReceiptDate(cashBook.opening.date)}. Transactions before
            that date are excluded from the cash book.
          </p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() => setIsOpeningOpen(true)}
          >
            Update opening cash
          </button>
        </section>
      ) : null}

      {isLoading ? (
        <div className="card mt-4 flex items-center justify-center gap-3 px-5 py-16 text-sm text-ink-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Loading cash book...
        </div>
      ) : loadError ? (
        <div className="card mt-4 px-5 py-10">
          <h2 className="text-base font-semibold text-ink-900">Cash book could not be loaded</h2>
          <p className="mt-1 text-sm text-ink-500">{loadError}</p>
          <button type="button" className="btn-secondary mt-4" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : cashBook ? (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="card overflow-hidden lg:col-span-2">
              <div className="border-b border-cream-200 px-5 py-4">
                <h2 className="text-base font-semibold text-ink-900">Daily closing</h2>
                <p className="mt-1 text-xs text-ink-400">
                  Opening cash + cash sales + cash collections + other cash transactions − cash
                  expenses − staff payments = expected closing cash.
                </p>
              </div>
              {cashBook.beforeOpening ? (
                <p className="px-5 py-10 text-sm text-ink-500">
                  No cash book for this date. Opening cash starts later.
                </p>
              ) : (
                <>
                  <div className="divide-y divide-cream-200">
                    <SummaryRow label="Opening cash" value={closing.openingCash} emphasis />
                    <SummaryRow
                      label="Cash sales"
                      hint="Retail and wholesale cash receipts"
                      value={closing.cashSales}
                    />
                    <SummaryRow
                      label="Cash collections"
                      hint="Payments received from parties"
                      value={closing.cashCollections}
                    />
                    <SummaryRow
                      label="Cash expenses"
                      hint="Operating expenses and loan interest paid in cash"
                      value={closing.cashExpenses}
                      negative
                    />
                    <SummaryRow
                      label="Staff payments"
                      hint="Salary, advances and staff payments paid in cash"
                      value={closing.staffPayments}
                      negative
                    />
                    <SummaryRow
                      label="Other cash transactions"
                      hint="Cash-count surplus or shortage adjustments, net"
                      value={closing.otherCashTransactions}
                      signed
                    />
                    <SummaryRow
                      label="Expected closing cash"
                      value={closing.expectedClosingCash}
                      emphasis
                    />
                    <SummaryRow
                      label="Physical cash"
                      hint={closing.isCounted ? undefined : 'Not counted yet for this date'}
                      value={closing.physicalCash}
                    />
                    <SummaryRow
                      label="Difference"
                      hint="Physical cash minus expected closing cash"
                      value={closing.difference}
                      signed
                      emphasis
                      valueClass={
                        closing.isCounted ? differenceClass(closing.difference) : 'text-ink-400'
                      }
                    />
                  </div>
                  <div className="border-t border-cream-200 px-5 py-4">
                    {closing.notes ? (
                      <p className="text-sm text-ink-600">
                        <span className="font-semibold text-ink-800">Closing notes:</span>{' '}
                        {closing.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-ink-400">
                        {closing.isCounted
                          ? 'No closing notes recorded.'
                          : 'Count the cash drawer and record closing notes to finish the day.'}
                      </p>
                    )}
                    {closing.isCounted ? (
                      <p className="mt-2 text-[11px] text-ink-400">
                        Counted {formatReceiptDate(closing.countedAt)} at{' '}
                        {formatReceiptTime(closing.countedAt)}
                        {closing.adjusted ? ' · cash book adjusted' : ' · not adjusted'}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="btn-secondary mt-3 w-full sm:w-auto"
                      onClick={() => setIsCountOpen(true)}
                    >
                      {closing.isCounted ? 'Update closing' : 'Record daily closing'}
                    </button>
                  </div>
                </>
              )}
            </section>

            <div className="space-y-4">
              <section className="card border-brand-100 bg-brand-50/50 p-5">
                <span className="pill border border-brand-200 bg-white uppercase tracking-[0.12em] text-brand-700">
                  Cash only
                </span>
                <h2 className="mt-3 text-base font-semibold text-ink-900">
                  Credit sales are not cash
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  A ₹20,000 credit invoice raises sales and receivables by ₹20,000 but adds ₹0 to
                  the cash book. Only cash receipts increase cash in hand.
                </p>
                <Link
                  to="/receivables"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
                >
                  View receivables
                  <NavIcon name="arrowRight" className="h-4 w-4" />
                </Link>
              </section>

              <section className="card p-5">
                <h2 className="text-base font-semibold text-ink-900">Closing checklist</h2>
                <ul className="mt-3 space-y-2 text-sm text-ink-500">
                  <li className="flex items-start gap-2">
                    <NavIcon
                      name="check"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        closing.isCounted ? 'text-emerald-600' : 'text-ink-300'
                      }`}
                    />
                    Physical cash counted
                  </li>
                  <li className="flex items-start gap-2">
                    <NavIcon
                      name="check"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        closing.isCounted && Math.abs(Number(closing.difference)) < 0.005
                          ? 'text-emerald-600'
                          : 'text-ink-300'
                      }`}
                    />
                    Difference explained or adjusted
                  </li>
                  <li className="flex items-start gap-2">
                    <NavIcon
                      name="check"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        closing.notes ? 'text-emerald-600' : 'text-ink-300'
                      }`}
                    />
                    Closing notes added
                  </li>
                </ul>
              </section>
            </div>
          </div>

          <section className="card mt-4 overflow-hidden">
            <div className="border-b border-cream-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink-900">Cash transactions</h2>
              <p className="mt-1 text-xs text-ink-400">
                Every cash movement on {formatDateKeyLong(cashBook.date)} with its running balance.
              </p>
            </div>

            {cashBook.entries.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <NavIcon name="cashbook" className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900">
                  No cash transactions on this date
                </h3>
                <p className="mt-1 max-w-sm text-sm text-ink-500">
                  Cash sales, party collections, cash expenses and other cash movements will appear
                  here.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                      <tr className="border-b border-cream-200">
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Reference
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Description
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          Cash in
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          Cash out
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200">
                      {cashBook.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink-900">
                            {entry.reference}
                          </td>
                          <td className="px-5 py-3.5 text-ink-700">{entry.description}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right text-emerald-700">
                            {entry.in > 0 ? formatINR2(entry.in) : '—'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right text-red-700">
                            {entry.out > 0 ? formatINR2(entry.out) : '—'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-ink-900">
                            {formatINR2(entry.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400">
                  Running balance starts at the opening cash of {formatINR2(summary.openingCash)}{' '}
                  and ends at the closing cash of {formatINR2(summary.closingCash)}.
                </p>
              </>
            )}
          </section>
        </>
      ) : null}

      {isOpeningOpen ? (
        <OpeningCashDialog
          opening={cashBook?.opening ?? { balance: 0, date: null }}
          onClose={() => setIsOpeningOpen(false)}
          onSaved={() => {
            setIsOpeningOpen(false);
            refresh();
          }}
        />
      ) : null}

      {isCountOpen && cashBook ? (
        <PhysicalCashDialog
          cashBook={cashBook}
          onClose={() => setIsCountOpen(false)}
          onSaved={(updatedBook) => {
            setCashBook(updatedBook);
            setIsCountOpen(false);
          }}
        />
      ) : null}
    </div>
  );
};

export default CashBookPage;
