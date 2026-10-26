import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import SaleReceiptDialog from '../components/SaleReceiptDialog';
import Spinner from '../components/Spinner';
import { createSaleApi, getSalesApi } from '../services/saleService';
import { getProductsApi } from '../services/productService';
import { getStockOverviewApi } from '../services/stockService';
import { PAYMENT_METHODS, getPaymentLabel } from '../utils/billing';
import { getApiErrorMessage } from '../utils/errors';
import {
  formatINR2,
  formatQuantity,
  formatRate,
  formatReceiptTime,
} from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const QUICK_AMOUNTS = [50, 100, 200, 500];

const toNumber = (value) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const RetailBillingPage = () => {
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [productsToken, setProductsToken] = useState(0);

  const [productId, setProductId] = useState('');
  const [rate, setRate] = useState('');
  const [inputMode, setInputMode] = useState('amount');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [recentSales, setRecentSales] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState('');
  const [recentToken, setRecentToken] = useState(0);

  const [receiptSale, setReceiptSale] = useState(null);
  const [receiptMode, setReceiptMode] = useState('completed');

  const [stockByProduct, setStockByProduct] = useState({});
  const [stockToken, setStockToken] = useState(0);

  const amountRef = useRef(null);
  const quantityRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    getProductsApi({ active: true })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(data.products) ? data.products : [];
        setProducts(items);

        if (items.length > 0) {
          const defaultProduct =
            items.find((product) => product.name.trim().toLowerCase() === 'muri') ?? items[0];
          setProductId(defaultProduct._id);
          setRate(String(defaultProduct.retailRate));
        } else {
          setProductId('');
          setRate('');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setProductsError(getApiErrorMessage(error, 'Unable to load active products.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productsToken]);

  useEffect(() => {
    let isMounted = true;

    getSalesApi({ type: 'retail', limit: 8 })
      .then((data) => {
        if (isMounted) {
          setRecentSales(Array.isArray(data.sales) ? data.sales : []);
          setRecentError('');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setRecentError(getApiErrorMessage(error, 'Unable to load recent bills.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRecent(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [recentToken]);

  useEffect(() => {
    let isMounted = true;

    getStockOverviewApi()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const next = {};
        (Array.isArray(data.stocks) ? data.stocks : []).forEach((item) => {
          next[String(item.productId)] = item;
        });
        setStockByProduct(next);
      })
      .catch(() => {
        if (isMounted) {
          setStockByProduct({});
        }
      });

    return () => {
      isMounted = false;
    };
  }, [stockToken]);

  const selectedProduct = products.find((product) => product._id === productId) ?? null;
  const selectedStock = stockByProduct[productId] ?? null;
  const unit = selectedProduct?.unit || 'KG';
  const rateValue = toNumber(rate);
  const amountValue = toNumber(amount);
  const quantityValue = toNumber(quantity);

  const calculatedQuantity =
    inputMode === 'amount'
      ? rateValue !== null && rateValue > 0 && amountValue !== null && amountValue > 0
        ? amountValue / rateValue
        : null
      : quantityValue !== null && quantityValue > 0
        ? quantityValue
        : null;

  const calculatedAmount =
    inputMode === 'amount'
      ? amountValue !== null && amountValue > 0
        ? amountValue
        : null
      : rateValue !== null && rateValue > 0 && quantityValue !== null && quantityValue > 0
        ? roundMoney(quantityValue * rateValue)
        : null;

  const handleProductsRetry = () => {
    setProductsError('');
    setIsLoadingProducts(true);
    setProductsToken((token) => token + 1);
  };

  const handleRecentRetry = () => {
    setRecentError('');
    setIsLoadingRecent(true);
    setRecentToken((token) => token + 1);
  };

  const handleProductChange = (event) => {
    const nextId = event.target.value;
    const product = products.find((item) => item._id === nextId);

    setProductId(nextId);
    if (product) {
      setRate(String(product.retailRate));
    }
    setErrors((prev) => ({ ...prev, productId: '', rate: '' }));
  };

  const handleRateChange = (event) => {
    setRate(event.target.value);
    setErrors((prev) => ({ ...prev, rate: '' }));
  };

  const handleModeChange = (nextMode) => {
    if (nextMode === inputMode) {
      return;
    }

    if (nextMode === 'quantity') {
      setQuantity(calculatedQuantity !== null ? calculatedQuantity.toFixed(2) : '');
    } else {
      setAmount(calculatedAmount !== null ? calculatedAmount.toFixed(2) : '');
    }

    setInputMode(nextMode);
    setErrors((prev) => ({ ...prev, amount: '', quantity: '' }));
  };

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
    setErrors((prev) => ({ ...prev, amount: '' }));
  };

  const handleQuantityChange = (event) => {
    setQuantity(event.target.value);
    setErrors((prev) => ({ ...prev, quantity: '' }));
  };

  const handlePaymentChange = (method) => {
    setPaymentMethod(method);
    setErrors((prev) => ({ ...prev, customerName: '' }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!selectedProduct) {
      nextErrors.productId = 'Select an active product.';
    }

    if (rateValue === null || rateValue <= 0) {
      nextErrors.rate = 'Enter a rate greater than 0.';
    }

    if (inputMode === 'amount') {
      if (amountValue === null || amountValue <= 0) {
        nextErrors.amount = 'Enter an amount greater than 0.';
      }
    } else if (quantityValue === null || quantityValue <= 0) {
      nextErrors.quantity = 'Enter a quantity greater than 0.';
    }

    if (paymentMethod === 'credit' && !customerName.trim()) {
      nextErrors.customerName = 'Customer or party name is required for credit sales.';
    } else if (customerName.trim().length > 150) {
      nextErrors.customerName = 'Customer name cannot be longer than 150 characters.';
    }

    if (notes.trim().length > 500) {
      nextErrors.notes = 'Notes cannot be longer than 500 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setIsSaving(true);

    try {
      const data = await createSaleApi({
        productId,
        inputMode,
        rate: rateValue,
        amount: inputMode === 'amount' ? amountValue : undefined,
        quantity: inputMode === 'quantity' ? quantityValue : undefined,
        paymentMethod,
        customerName: customerName.trim(),
        notes: notes.trim(),
      });

      setRecentSales((prev) => [data.sale, ...prev].slice(0, 8));
      setStockToken((token) => token + 1);
      setReceiptMode('completed');
      setReceiptSale(data.sale);
      toast.success(`Bill ${data.sale.billNumber} completed.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save the sale.'));
    } finally {
      setIsSaving(false);
    }
  };

  const closeReceipt = () => setReceiptSale(null);

  const handleNewSale = () => {
    setReceiptSale(null);
    setAmount('');
    setQuantity('');
    setCustomerName('');
    setNotes('');
    setPaymentMethod('cash');
    setErrors({});

    window.setTimeout(() => {
      if (inputMode === 'amount') {
        amountRef.current?.focus();
      } else {
        quantityRef.current?.focus();
      }
    }, 0);
  };

  const openReceipt = (sale) => {
    setReceiptMode('view');
    setReceiptSale(sale);
  };

  const showBillingForm = !isLoadingProducts && !productsError && products.length > 0;
  const modeUnitLabel = unit;

  return (
    <div>
      <PageHeader
        title="Retail Billing"
        description="Record a counter sale by amount or weight. Rates come from the product master, and every bill receives a sequential R-number."
        actions={
          <Link to="/products" className="btn-secondary">
            Manage products
          </Link>
        }
      />

      {isLoadingProducts ? (
        <section className="card flex items-center justify-center gap-3 px-6 py-16 text-sm text-ink-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Loading products...
        </section>
      ) : productsError ? (
        <section className="card px-6 py-10">
          <h2 className="text-base font-semibold text-ink-900">Billing could not be prepared</h2>
          <p className="mt-1 text-sm text-ink-500">{productsError}</p>
          <button type="button" className="btn-secondary mt-4" onClick={handleProductsRetry}>
            Try again
          </button>
        </section>
      ) : products.length === 0 ? (
        <section className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <NavIcon name="products" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">No active products</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            Add or reactivate a product in Product Management before recording a sale.
          </p>
          <Link to="/products" className="btn-primary mt-5">
            Open Product Management
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
          <form onSubmit={handleSubmit} noValidate className="card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Product"
                htmlFor="sale-product"
                error={errors.productId}
                required
              >
                <select
                  id="sale-product"
                  className={fieldInputClass(Boolean(errors.productId))}
                  value={productId}
                  onChange={handleProductChange}
                >
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.unit})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label={`Rate per ${unit}`}
                htmlFor="sale-rate"
                error={errors.rate}
                hint="Prefilled from the product master."
                required
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                    ₹
                  </span>
                  <input
                    id="sale-rate"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className={`${fieldInputClass(Boolean(errors.rate))} pl-8`}
                    value={rate}
                    onChange={handleRateChange}
                  />
                </div>
              </FormField>
            </div>

            <div className="mt-5">
              <div
                className="grid grid-cols-2 gap-1 rounded-xl bg-cream-100 p-1"
                role="group"
                aria-label="Billing calculation mode"
              >
                <button
                  type="button"
                  aria-pressed={inputMode === 'amount'}
                  onClick={() => handleModeChange('amount')}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    inputMode === 'amount'
                      ? 'bg-white text-ink-900 shadow-sm'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  Amount → {modeUnitLabel}
                </button>
                <button
                  type="button"
                  aria-pressed={inputMode === 'quantity'}
                  onClick={() => handleModeChange('quantity')}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    inputMode === 'quantity'
                      ? 'bg-white text-ink-900 shadow-sm'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {modeUnitLabel} → Amount
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.8fr)]">
                {inputMode === 'amount' ? (
                  <FormField
                    label="Amount received"
                    htmlFor="sale-amount"
                    error={errors.amount}
                    required
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-ink-500">
                        ₹
                      </span>
                      <input
                        id="sale-amount"
                        ref={amountRef}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        autoFocus
                        placeholder="100"
                        className={`${fieldInputClass(Boolean(errors.amount))} pl-8 text-lg font-semibold`}
                        value={amount}
                        onChange={handleAmountChange}
                      />
                    </div>
                  </FormField>
                ) : (
                  <FormField
                    label={`Quantity (${unit})`}
                    htmlFor="sale-quantity"
                    error={errors.quantity}
                    required
                  >
                    <div className="relative">
                      <input
                        id="sale-quantity"
                        ref={quantityRef}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        autoFocus
                        placeholder="2.2"
                        className={`${fieldInputClass(Boolean(errors.quantity))} pr-14 text-lg font-semibold`}
                        value={quantity}
                        onChange={handleQuantityChange}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">
                        {unit}
                      </span>
                    </div>
                  </FormField>
                )}

                <div className="rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                    {inputMode === 'amount' ? 'Calculated quantity' : 'Calculated amount'}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
                    {inputMode === 'amount'
                      ? calculatedQuantity !== null
                        ? `${formatQuantity(calculatedQuantity)} ${unit}`
                        : '—'
                      : calculatedAmount !== null
                        ? formatINR2(calculatedAmount)
                        : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {inputMode === 'amount'
                      ? `${formatINR2(rateValue)} per ${unit}`
                      : `${formatQuantity(quantityValue)} ${unit} × ${formatINR2(rateValue)}`}
                  </p>
                </div>
              </div>

              {selectedStock &&
              calculatedQuantity !== null &&
              calculatedQuantity > selectedStock.quantity + 1e-9 ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  Only {formatQuantity(selectedStock.quantity)} {unit} available. Reduce the
                  quantity or add stock before saving.
                </p>
              ) : null}

              {inputMode === 'amount' ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink-400">Quick amount</span>
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAmount(String(value));
                        setErrors((prev) => ({ ...prev, amount: '' }));
                      }}
                      className="rounded-md border border-cream-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                    >
                      ₹{value}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-5">
              <p className="field-label">Payment method</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    aria-pressed={paymentMethod === method.value}
                    onClick={() => handlePaymentChange(method.value)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                      paymentMethod === method.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-cream-300 bg-white text-ink-700 hover:bg-cream-50'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              {paymentMethod === 'credit' ? (
                <p className="mt-1.5 text-xs text-ink-400">
                  Credit sales require a customer or party name.
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4">
              <FormField
                label="Customer / party name"
                htmlFor="sale-customer"
                error={errors.customerName}
                required={paymentMethod === 'credit'}
                hint={
                  paymentMethod === 'credit'
                    ? 'Required for credit sales and stored as the party for this bill.'
                    : 'Optional. Printed on the receipt when entered.'
                }
              >
                <input
                  id="sale-customer"
                  type="text"
                  maxLength={150}
                  className={fieldInputClass(Boolean(errors.customerName))}
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={(event) => {
                    setCustomerName(event.target.value);
                    setErrors((prev) => ({ ...prev, customerName: '' }));
                  }}
                />
              </FormField>

              <FormField
                label="Notes"
                htmlFor="sale-notes"
                error={errors.notes}
                hint="Optional. Up to 500 characters."
              >
                <textarea
                  id="sale-notes"
                  rows={2}
                  maxLength={500}
                  className={fieldInputClass(Boolean(errors.notes))}
                  placeholder="Any remark for this bill"
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setErrors((prev) => ({ ...prev, notes: '' }));
                  }}
                />
              </FormField>
            </div>

            <button type="submit" className="btn-primary mt-5 w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner /> Saving sale...
                </>
              ) : (
                `Complete sale${calculatedAmount !== null ? ` · ${formatINR2(calculatedAmount)}` : ''}`
              )}
            </button>
          </form>

          <div className="space-y-4">
            <section className="card p-5">
              <h2 className="text-base font-semibold text-ink-900">Bill summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500">Product</dt>
                  <dd className="font-medium text-ink-900">{selectedProduct?.name ?? '—'}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500">Rate</dt>
                  <dd className="font-medium text-ink-900">
                    {rateValue !== null ? `${formatRate(rateValue)} / ${unit}` : '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500">Quantity</dt>
                  <dd className="font-medium text-ink-900">
                    {calculatedQuantity !== null
                      ? `${formatQuantity(calculatedQuantity)} ${unit}`
                      : '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500">Available stock</dt>
                  <dd className="font-medium text-ink-900">
                    {selectedStock
                      ? `${formatQuantity(selectedStock.quantity)} ${unit}`
                      : '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500">Payment</dt>
                  <dd className="font-medium text-ink-900">
                    {getPaymentLabel(paymentMethod)}
                  </dd>
                </div>
                {customerName.trim() ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-500">Customer</dt>
                    <dd className="max-w-[60%] truncate text-right font-medium text-ink-900">
                      {customerName.trim()}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex items-baseline justify-between border-t border-cream-200 pt-3">
                <span className="text-sm font-semibold text-ink-700">Bill total</span>
                <span className="text-xl font-semibold tracking-tight text-ink-900">
                  {calculatedAmount !== null ? formatINR2(calculatedAmount) : '—'}
                </span>
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/60 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">Recent bills</h2>
                  <p className="mt-0.5 text-xs text-ink-500">Latest retail sales</p>
                </div>
                {recentSales.length > 0 ? (
                  <span className="pill bg-cream-100 text-ink-500">{recentSales.length}</span>
                ) : null}
              </div>

              {isLoadingRecent ? (
                <div className="flex items-center justify-center gap-3 px-5 py-8 text-sm text-ink-500">
                  <Spinner className="h-4 w-4 text-brand-600" />
                  Loading bills...
                </div>
              ) : recentError ? (
                <div className="px-5 py-6">
                  <p className="text-sm text-ink-500">{recentError}</p>
                  <button
                    type="button"
                    className="btn-secondary mt-3 w-full"
                    onClick={handleRecentRetry}
                  >
                    Try again
                  </button>
                </div>
              ) : recentSales.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-500">
                  No retail bills yet. The first completed sale will appear here.
                </p>
              ) : (
                <ul className="divide-y divide-cream-200">
                  {recentSales.map((sale) => (
                    <li key={sale._id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900">{sale.billNumber}</p>
                        <p className="truncate text-xs text-ink-500">
                          {sale.productName} · {formatQuantity(sale.quantity)} {sale.unit} ·{' '}
                          {getPaymentLabel(sale.paymentMethod)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-ink-900">
                          {formatINR2(sale.amount)}
                        </p>
                        <p className="text-[11px] text-ink-400">
                          {formatReceiptTime(sale.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openReceipt(sale)}
                        className="shrink-0 rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      >
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="px-1 text-xs text-ink-400">
              Quantity is calculated automatically and stored with full precision. Stock is
              deducted when the bill is completed and recorded in the stock ledger.
            </p>
          </div>
        </div>
      )}

      {showBillingForm && receiptSale ? (
        <SaleReceiptDialog
          sale={receiptSale}
          mode={receiptMode}
          onClose={closeReceipt}
          onNewSale={handleNewSale}
        />
      ) : null}
    </div>
  );
};

export default RetailBillingPage;
