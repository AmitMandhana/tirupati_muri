import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import StockMovementDialog from '../components/StockMovementDialog';
import { getStockLedgerApi, getStockOverviewApi } from '../services/stockService';
import { getApiErrorMessage } from '../utils/errors';
import { fieldInputClass } from '../utils/formStyles';
import {
  formatQuantity,
  formatReceiptDate,
  formatReceiptTime,
} from '../utils/format';
import { STOCK_TYPE_STYLES, getStockTypeLabel } from '../utils/stock';

const LEDGER_LIMIT = 50;

const StockPage = () => {
  const [stocks, setStocks] = useState([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [overviewToken, setOverviewToken] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState('');

  const [ledger, setLedger] = useState(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(true);
  const [ledgerError, setLedgerError] = useState('');
  const [ledgerToken, setLedgerToken] = useState(0);
  const [dialogAction, setDialogAction] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getStockOverviewApi()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(data.stocks) ? data.stocks : [];
        setStocks(items);
        setLowStockThreshold(Number(data.lowStockThreshold) || 0);
        setLoadError('');
        setSelectedProductId((previous) => {
          if (previous && items.some((item) => String(item.productId) === previous)) {
            return previous;
          }

          const muri = items.find(
            (item) => item.productName.trim().toLowerCase() === 'muri',
          );
          const next = muri ?? items[0];
          return next ? String(next.productId) : '';
        });
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(getApiErrorMessage(error, 'Unable to load stock.'));
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
  }, [overviewToken]);

  useEffect(() => {
    if (!selectedProductId) {
      return undefined;
    }

    let isMounted = true;

    getStockLedgerApi(selectedProductId, { limit: LEDGER_LIMIT })
      .then((data) => {
        if (isMounted) {
          setLedger(data);
          setLedgerError('');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLedgerError(getApiErrorMessage(error, 'Unable to load the stock ledger.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingLedger(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProductId, ledgerToken]);

  const selectedStock =
    stocks.find((stock) => String(stock.productId) === selectedProductId) ?? null;
  const transactions = ledger?.transactions ?? [];

  const handleOverviewRetry = () => {
    setLoadError('');
    setIsLoading(true);
    setOverviewToken((token) => token + 1);
  };

  const handleLedgerRetry = () => {
    setLedgerError('');
    setIsLoadingLedger(true);
    setLedgerToken((token) => token + 1);
  };

  const handleProductChange = (event) => {
    setSelectedProductId(event.target.value);
    setLedger(null);
    setLedgerError('');
    setIsLoadingLedger(true);
  };

  const handleSaved = () => {
    setDialogAction(null);
    setOverviewToken((token) => token + 1);
    setLedgerToken((token) => token + 1);
    setIsLoadingLedger(true);
  };

  const closeDialog = () => setDialogAction(null);

  const pageHeader = (
    <PageHeader
      title="Stock"
      description="Track Muri stock from opening balance through every sale, purchase, wastage and adjustment. Every change is written to the stock ledger."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setDialogAction('purchase')}
          disabled={!selectedStock}
        >
          Add stock
        </button>
      }
    />
  );

  if (isLoading) {
    return (
      <div>
        {pageHeader}
        <section className="card flex items-center justify-center gap-3 px-6 py-16 text-sm text-ink-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Loading stock...
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        {pageHeader}
        <section className="card px-6 py-10">
          <h2 className="text-base font-semibold text-ink-900">Stock could not be loaded</h2>
          <p className="mt-1 text-sm text-ink-500">{loadError}</p>
          <button type="button" className="btn-secondary mt-4" onClick={handleOverviewRetry}>
            Try again
          </button>
        </section>
      </div>
    );
  }

  if (!selectedStock) {
    return (
      <div>
        {pageHeader}
        <section className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <NavIcon name="products" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">No products to track</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            Add a product in Product Management before recording stock.
          </p>
          <Link to="/products" className="btn-primary mt-5">
            Open Product Management
          </Link>
        </section>
      </div>
    );
  }

  const { productName, unit, quantity, bags, bagWeight, openingRecorded, lowStock } =
    selectedStock;
  const lastMovement = selectedStock.lastTransactionAt;

  return (
    <div>
      {pageHeader}

      <div className="space-y-4">
        {!openingRecorded ? (
          <section className="card border-brand-200 bg-brand-50/70 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  Opening stock not recorded
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Enter the {productName} quantity currently on hand to start tracking stock.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary shrink-0"
                onClick={() => setDialogAction('opening')}
              >
                Record opening stock
              </button>
            </div>
          </section>
        ) : null}

        {openingRecorded && lowStock ? (
          <section
            role="alert"
            className="card border-red-200 bg-red-50/70 p-5"
          >
            <h2 className="text-base font-semibold text-red-800">Low stock warning</h2>
            <p className="mt-1 text-sm text-red-700">
              {productName} is below the minimum of {formatQuantity(lowStockThreshold)} {unit}.
              Current stock: {formatQuantity(quantity)} {unit}.
            </p>
          </section>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <div className="min-w-0 space-y-4">
            <section className="card p-5 sm:p-6">
              {stocks.length > 1 ? (
                <div className="mb-5 max-w-xs">
                  <FormField label="Product" htmlFor="stock-product">
                    <select
                      id="stock-product"
                      className={fieldInputClass(false)}
                      value={selectedProductId}
                      onChange={handleProductChange}
                    >
                      {stocks.map((stock) => (
                        <option key={stock.productId} value={stock.productId}>
                          {stock.productName}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              ) : null}

              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                    Current {productName} stock
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-tight text-ink-900">
                    {formatQuantity(quantity)}{' '}
                    <span className="text-base font-medium text-ink-500">{unit}</span>
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {formatQuantity(bags)} bags · {bagWeight} {unit} per bag
                  </p>
                  <span
                    className={`pill mt-3 ${
                      lowStock ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        lowStock ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      aria-hidden="true"
                    />
                    {lowStock ? 'Low stock' : 'Stock available'}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:min-w-[280px]">
                  <div>
                    <dt className="text-xs text-ink-400">Minimum stock</dt>
                    <dd className="mt-0.5 font-semibold text-ink-900">
                      {formatQuantity(lowStockThreshold)} {unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-400">Opening stock</dt>
                    <dd className="mt-0.5 font-semibold text-ink-900">
                      {openingRecorded ? 'Recorded' : 'Not recorded'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-ink-400">Last movement</dt>
                    <dd className="mt-0.5 font-semibold text-ink-900">
                      {lastMovement
                        ? `${formatReceiptDate(lastMovement)} · ${formatReceiptTime(lastMovement)}`
                        : 'No movements yet'}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/60 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">Stock ledger</h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Every stock change, newest first
                  </p>
                </div>
                <span className="pill bg-cream-100 text-ink-500">
                  {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {isLoadingLedger ? (
                <div className="flex items-center justify-center gap-3 px-5 py-12 text-sm text-ink-500">
                  <Spinner className="h-4 w-4 text-brand-600" />
                  Loading ledger...
                </div>
              ) : ledgerError ? (
                <div className="px-5 py-8">
                  <p className="text-sm text-ink-500">{ledgerError}</p>
                  <button
                    type="button"
                    className="btn-secondary mt-3"
                    onClick={handleLedgerRetry}
                  >
                    Try again
                  </button>
                </div>
              ) : transactions.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-ink-500">
                  No stock transactions yet. Record opening stock or add stock to begin.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                      <tr className="border-b border-cream-200">
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Date
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Transaction
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Reference
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          In
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          Out
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200">
                      {transactions.map((transaction) => {
                        const isInflow = transaction.quantity > 0;

                        return (
                          <tr key={transaction._id} className="align-top">
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <p className="font-medium text-ink-900">
                                {formatReceiptDate(transaction.date)}
                              </p>
                              <p className="text-[11px] text-ink-400">
                                {formatReceiptTime(transaction.date)}
                              </p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`pill ${
                                  STOCK_TYPE_STYLES[transaction.type] ??
                                  'bg-cream-100 text-ink-700'
                                }`}
                              >
                                {getStockTypeLabel(transaction.type)}
                              </span>
                              {transaction.notes ? (
                                <p className="mt-1 max-w-[220px] text-xs text-ink-400">
                                  {transaction.notes}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-5 py-3.5">
                              {transaction.referenceId ? (
                                <span className="font-medium text-ink-700">
                                  {transaction.referenceId}
                                </span>
                              ) : (
                                <span className="text-ink-400">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium text-emerald-700">
                              {isInflow ? formatQuantity(transaction.quantity) : '—'}
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium text-red-600">
                              {isInflow ? '—' : formatQuantity(Math.abs(transaction.quantity))}
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold text-ink-900">
                              {formatQuantity(transaction.balanceAfter)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {!isLoadingLedger && !ledgerError && transactions.length > 0 ? (
                <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400 sm:hidden">
                  Swipe the table sideways to see the reference, in, out and balance columns.
                </p>
              ) : null}
            </section>
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="card p-5">
              <h2 className="text-base font-semibold text-ink-900">Stock actions</h2>
              <p className="mt-1 text-xs text-ink-500">
                Every change is recorded against this product.
              </p>
              <div className="mt-4 space-y-2">
                {!openingRecorded ? (
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={() => setDialogAction('opening')}
                  >
                    Record opening stock
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setDialogAction('purchase')}
                >
                  Add stock
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setDialogAction('wastage')}
                >
                  Record wastage
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setDialogAction('adjustment')}
                >
                  Adjust stock
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-400">
                Retail sales are deducted automatically when a bill is completed. Production and
                wholesale deductions will use the same ledger.
              </p>
            </section>

            <section className="card p-5">
              <h2 className="text-base font-semibold text-ink-900">Low-stock alert</h2>
              <p className="mt-1 text-sm text-ink-500">
                A warning appears on the dashboard when this product falls below the minimum.
              </p>
              <div className="mt-3 flex items-baseline justify-between rounded-lg bg-cream-50 px-3 py-2 text-sm">
                <span className="text-ink-500">Minimum stock</span>
                <span className="font-semibold text-ink-900">
                  {formatQuantity(lowStockThreshold)} {unit}
                </span>
              </div>
              <Link
                to="/settings"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
              >
                Change in settings
                <NavIcon name="arrowRight" className="h-4 w-4" />
              </Link>
            </section>
          </aside>
        </div>
      </div>

      {dialogAction && selectedStock ? (
        <StockMovementDialog
          action={dialogAction}
          product={selectedStock}
          onClose={closeDialog}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
};

export default StockPage;
