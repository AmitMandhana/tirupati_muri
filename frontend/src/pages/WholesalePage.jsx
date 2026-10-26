import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import PartyFormDialog from '../components/PartyFormDialog';
import Spinner from '../components/Spinner';
import StatCard from '../components/StatCard';
import WholesaleInvoiceDialog from '../components/WholesaleInvoiceDialog';
import { createInvoiceApi, getInvoicesApi } from '../services/invoiceService';
import { getBankAccountsApi } from '../services/bankAccountService';
import { getPartiesApi, getReceivablesApi } from '../services/partyService';
import { getProductsApi } from '../services/productService';
import { getStockOverviewApi } from '../services/stockService';
import { PAYMENT_METHODS, getPaymentLabel } from '../utils/billing';
import { getApiErrorMessage } from '../utils/errors';
import {
  formatINR2,
  formatQuantity,
  formatRate,
  formatReceiptDate,
  formatReceiptTime,
} from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';
import { getInvoiceStatus, getInvoiceStatusMeta } from '../utils/invoice';

const ROW_LIMIT = 200;

const toNumber = (value) => {
  const text = String(value ?? '').trim();

  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const StatusPill = ({ status }) => {
  const meta = getInvoiceStatusMeta(status);

  return (
    <span className={`pill ${meta.pillClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

const WholesalePage = () => {
  const [tab, setTab] = useState('new');

  const [parties, setParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(true);
  const [partiesError, setPartiesError] = useState('');
  const [partiesToken, setPartiesToken] = useState(0);
  const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
  const [partyBalances, setPartyBalances] = useState({});
  const [partyBalancesToken, setPartyBalancesToken] = useState(0);

  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [productsToken, setProductsToken] = useState(0);

  const [stockByProduct, setStockByProduct] = useState({});
  const [stockToken, setStockToken] = useState(0);

  const [partyId, setPartyId] = useState('');
  const [productId, setProductId] = useState('');
  const [rate, setRate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [paid, setPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [invoiceDialog, setInvoiceDialog] = useState(null);
  const [invoiceDialogMode, setInvoiceDialogMode] = useState('completed');

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyToken, setHistoryToken] = useState(0);

  const quantityRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    getPartiesApi({ active: true })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(data.parties) ? data.parties : [];
        setParties(items);
        setPartiesError('');
        setPartyId((previous) => {
          if (previous && items.some((party) => party._id === previous)) {
            return previous;
          }

          return items[0]?._id ?? '';
        });
      })
      .catch((error) => {
        if (isMounted) {
          setPartiesError(getApiErrorMessage(error, 'Unable to load parties.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingParties(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [partiesToken]);

  useEffect(() => {
    let isMounted = true;

    getReceivablesApi()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const next = {};
        (Array.isArray(data.parties) ? data.parties : []).forEach((party) => {
          next[String(party._id)] = party;
        });
        setPartyBalances(next);
      })
      .catch(() => {
        if (isMounted) {
          setPartyBalances({});
        }
      });

    return () => {
      isMounted = false;
    };
  }, [partyBalancesToken]);

  useEffect(() => {
    let isMounted = true;

    getProductsApi({ active: true })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const items = Array.isArray(data.products) ? data.products : [];
        setProducts(items);
        setProductsError('');

        if (items.length > 0) {
          const defaultProduct =
            items.find((product) => product.name.trim().toLowerCase() === 'muri') ?? items[0];
          setProductId((previous) =>
            previous && items.some((product) => product._id === previous)
              ? previous
              : defaultProduct._id,
          );
          setRate((previous) => {
            if (previous) {
              return previous;
            }

            const current = items.find((product) => product._id === productId) ?? defaultProduct;
            return String(current.wholesaleRate);
          });
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
    // productId is read only as a fallback for the rate; it is not a fetch trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsToken]);

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

  useEffect(() => {
    let isMounted = true;

    getBankAccountsApi()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const items = (Array.isArray(data.accounts) ? data.accounts : []).filter(
          (account) => account.active,
        );
        setBankAccounts(items);
        setBankAccountId((previous) => previous || items[0]?._id || '');
      })
      .catch(() => {
        if (isMounted) {
          setBankAccounts([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const timer = window.setTimeout(() => {
      getInvoicesApi({
        search: search.trim() || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        limit: ROW_LIMIT,
      })
        .then((data) => {
          if (!isMounted) {
            return;
          }

          setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
          setSummary(data.summary ?? null);
          setHistoryError('');
        })
        .catch((error) => {
          if (isMounted) {
            setHistoryError(getApiErrorMessage(error, 'Unable to load invoices.'));
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingHistory(false);
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [search, fromDate, toDate, historyToken]);

  const selectedParty = parties.find((party) => party._id === partyId) ?? null;
  const selectedPartyBalance = selectedParty
    ? Number(partyBalances[selectedParty._id]?.outstanding ?? 0)
    : 0;
  const selectedProduct = products.find((product) => product._id === productId) ?? null;
  const selectedStock = stockByProduct[productId] ?? null;
  const unit = selectedProduct?.unit || 'KG';
  const rateValue = toNumber(rate);
  const quantityValue = toNumber(quantity);
  const paidValue = toNumber(paid) ?? 0;
  const total =
    quantityValue !== null && quantityValue > 0 && rateValue !== null && rateValue > 0
      ? roundMoney(quantityValue * rateValue)
      : null;
  const due = total !== null ? roundMoney(Math.max(total - paidValue, 0)) : null;
  const previewStatus = total !== null ? getInvoiceStatus(total, paidValue) : 'credit';
  const showsBankAccount = paymentMethod === 'upi' || paymentMethod === 'bank';
  const needsBankAccount = showsBankAccount && paidValue > 0;

  const refreshParties = () => {
    setPartiesError('');
    setIsLoadingParties(true);
    setPartiesToken((token) => token + 1);
  };

  const refreshProducts = () => {
    setProductsError('');
    setIsLoadingProducts(true);
    setProductsToken((token) => token + 1);
  };

  const refreshHistory = () => {
    setHistoryError('');
    setIsLoadingHistory(true);
    setHistoryToken((token) => token + 1);
  };

  const handlePartySaved = (party) => {
    setParties((previous) =>
      [...previous.filter((item) => item._id !== party._id), party].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setPartyId(party._id);
    setIsPartyDialogOpen(false);
    setTab('new');
  };

  const handleProductChange = (event) => {
    const nextId = event.target.value;
    const product = products.find((item) => item._id === nextId);

    setProductId(nextId);
    setRate(product ? String(product.wholesaleRate) : '');
    setErrors((previous) => ({ ...previous, productId: '', rate: '' }));
  };

  const handlePaymentChange = (method) => {
    setPaymentMethod(method);
    setErrors((previous) => ({ ...previous, paid: '', bankAccount: '' }));
  };

  const handleFilterChange = (setter) => (event) => {
    setIsLoadingHistory(true);
    setHistoryError('');
    setter(event.target.value);
  };

  const clearFilters = () => {
    if (!search && !fromDate && !toDate) {
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError('');
    setSearch('');
    setFromDate('');
    setToDate('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!selectedParty) {
      nextErrors.partyId = 'Select a party.';
    }

    if (!selectedProduct) {
      nextErrors.productId = 'Select an active product.';
    }

    if (rateValue === null || rateValue <= 0) {
      nextErrors.rate = 'Enter a rate greater than 0.';
    }

    if (quantityValue === null || quantityValue <= 0) {
      nextErrors.quantity = 'Enter a quantity greater than 0.';
    }

    if (paidValue < 0) {
      nextErrors.paid = 'Amount received must be 0 or more.';
    } else if (total !== null && paidValue > total) {
      nextErrors.paid = 'Amount received cannot exceed the invoice total.';
    }

    if (notes.trim().length > 500) {
      nextErrors.notes = 'Notes cannot be longer than 500 characters.';
    }

    if (needsBankAccount && bankAccounts.length > 0 && !bankAccountId) {
      nextErrors.bankAccount = 'Select the bank account that received the payment.';
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
      const data = await createInvoiceApi({
        partyId,
        productId,
        quantity: quantityValue,
        rate: rateValue,
        paid: paidValue,
        paymentMethod,
        bankAccountId: needsBankAccount ? bankAccountId || undefined : undefined,
        notes: notes.trim(),
      });

      setInvoiceDialogMode('completed');
      setInvoiceDialog(data.invoice);
      setStockToken((token) => token + 1);
      setHistoryToken((token) => token + 1);
      setPartyBalancesToken((token) => token + 1);
      setIsLoadingHistory(true);
      toast.success(`Invoice ${data.invoice.invoiceNumber} saved.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save the invoice.'));
    } finally {
      setIsSaving(false);
    }
  };

  const closeInvoiceDialog = () => setInvoiceDialog(null);

  const handleNewInvoice = () => {
    setInvoiceDialog(null);
    setQuantity('');
    setPaid('');
    setNotes('');
    setErrors({});
    setPaymentMethod('cash');

    window.setTimeout(() => {
      quantityRef.current?.focus();
    }, 0);
  };

  const openInvoice = (invoice) => {
    setInvoiceDialogMode('view');
    setInvoiceDialog(invoice);
  };

  const isLoading = isLoadingParties || isLoadingProducts;
  const loadError = productsError || partiesError;
  const hasFilters = Boolean(search || fromDate || toDate);
  const statusMeta = getInvoiceStatusMeta(previewStatus);

  const renderBilling = () => {
    if (isLoading) {
      return (
        <section className="card flex items-center justify-center gap-3 px-6 py-16 text-sm text-ink-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Preparing wholesale billing...
        </section>
      );
    }

    if (loadError) {
      return (
        <section className="card px-6 py-10">
          <h2 className="text-base font-semibold text-ink-900">
            Wholesale billing could not be prepared
          </h2>
          <p className="mt-1 text-sm text-ink-500">{loadError}</p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={productsError ? refreshProducts : refreshParties}
          >
            Try again
          </button>
        </section>
      );
    }

    if (products.length === 0) {
      return (
        <section className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <NavIcon name="products" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">No active products</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            Add or reactivate a product in Product Management before raising a wholesale invoice.
          </p>
          <Link to="/products" className="btn-primary mt-5">
            Open Product Management
          </Link>
        </section>
      );
    }

    if (parties.length === 0) {
      return (
        <section className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <NavIcon name="parties" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">No active parties</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            Add a wholesale party with a phone number, then raise the first invoice. Inactive
            parties can be reactivated from the Parties page.
          </p>
          <button
            type="button"
            className="btn-primary mt-5"
            onClick={() => setIsPartyDialogOpen(true)}
          >
            Add party
          </button>
        </section>
      );
    }

    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <form onSubmit={handleSubmit} noValidate className="card p-5 sm:p-6">
          <FormField label="Party" htmlFor="invoice-party" error={errors.partyId} required>
            <div className="flex gap-2">
              <select
                id="invoice-party"
                className={`${fieldInputClass(Boolean(errors.partyId))} min-w-0 flex-1`}
                value={partyId}
                onChange={(event) => {
                  setPartyId(event.target.value);
                  setErrors((previous) => ({ ...previous, partyId: '' }));
                }}
              >
                {parties.map((party) => (
                  <option key={party._id} value={party._id}>
                    {party.name} · {party.phone}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => setIsPartyDialogOpen(true)}
              >
                Add party
              </button>
            </div>
          </FormField>

          {selectedParty ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
              <span>
                Outstanding{' '}
                <span className="font-semibold text-ink-900">
                  {formatINR2(selectedPartyBalance)}
                </span>
              </span>
              <span>
                Credit limit{' '}
                <span className="font-semibold text-ink-900">
                  {Number(selectedParty.creditLimit) > 0
                    ? formatINR2(selectedParty.creditLimit)
                    : 'No limit'}
                </span>
              </span>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField
              label="Product"
              htmlFor="invoice-product"
              error={errors.productId}
              required
            >
              <select
                id="invoice-product"
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
              htmlFor="invoice-rate"
              error={errors.rate}
              hint="Prefilled from the wholesale rate."
              required
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  ₹
                </span>
                <input
                  id="invoice-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className={`${fieldInputClass(Boolean(errors.rate))} pl-8`}
                  value={rate}
                  onChange={(event) => {
                    setRate(event.target.value);
                    setErrors((previous) => ({ ...previous, rate: '' }));
                  }}
                />
              </div>
            </FormField>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.8fr)]">
            <FormField
              label={`Quantity (${unit})`}
              htmlFor="invoice-quantity"
              error={errors.quantity}
              hint={
                selectedStock
                  ? `${formatQuantity(selectedStock.quantity)} ${unit} available`
                  : undefined
              }
              required
            >
              <div className="relative">
                <input
                  id="invoice-quantity"
                  ref={quantityRef}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="500"
                  className={`${fieldInputClass(Boolean(errors.quantity))} pr-14 text-lg font-semibold`}
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(event.target.value);
                    setErrors((previous) => ({ ...previous, quantity: '' }));
                  }}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">
                  {unit}
                </span>
              </div>
            </FormField>

            <div className="rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                Invoice total
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
                {total !== null ? formatINR2(total) : '—'}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {total !== null
                  ? `${formatQuantity(quantityValue)} ${unit} × ${formatRate(rateValue)}`
                  : 'Enter quantity and rate'}
              </p>
            </div>
          </div>

          {selectedStock &&
          quantityValue !== null &&
          quantityValue > selectedStock.quantity + 1e-9 ? (
            <p className="mt-1.5 text-xs font-medium text-red-600">
              Only {formatQuantity(selectedStock.quantity)} {unit} available. Reduce the quantity
              or add stock before saving.
            </p>
          ) : null}

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
          </div>

          {showsBankAccount ? (
            <div className="mt-4">
              {bankAccounts.length > 0 ? (
                <FormField
                  label="Received into bank account"
                  htmlFor="invoice-bank-account"
                  error={errors.bankAccount}
                  hint={
                    paidValue > 0
                      ? 'This receipt increases the selected bank balance.'
                      : 'Applies when an amount is received now.'
                  }
                  required={paidValue > 0}
                >
                  <select
                    id="invoice-bank-account"
                    className={fieldInputClass(Boolean(errors.bankAccount))}
                    value={bankAccountId}
                    onChange={(event) => {
                      setBankAccountId(event.target.value);
                      setErrors((previous) => ({ ...previous, bankAccount: '' }));
                    }}
                  >
                    {bankAccounts.map((bankAccount) => (
                      <option key={bankAccount._id} value={bankAccount._id}>
                        {bankAccount.bankName} · {bankAccount.maskedAccountNumber} ·{' '}
                        {formatINR2(bankAccount.balance)}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : (
                <p className="rounded-lg bg-cream-50 px-3 py-2 text-xs text-ink-500">
                  No active bank accounts yet. Add one from Bank Accounts to update a bank balance
                  with this receipt.
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField
              label="Amount received"
              htmlFor="invoice-paid"
              error={errors.paid}
              hint="Leave blank when the full amount is due."
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  ₹
                </span>
                <input
                  id="invoice-paid"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className={`${fieldInputClass(Boolean(errors.paid))} pl-8`}
                  value={paid}
                  onChange={(event) => {
                    setPaid(event.target.value);
                    setErrors((previous) => ({ ...previous, paid: '' }));
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-cream-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                  onClick={() => {
                    setPaid(total !== null ? String(total) : '');
                    setErrors((previous) => ({ ...previous, paid: '' }));
                  }}
                >
                  Full payment
                </button>
                <button
                  type="button"
                  className="rounded-md border border-cream-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                  onClick={() => {
                    setPaid('');
                    setErrors((previous) => ({ ...previous, paid: '' }));
                  }}
                >
                  No payment
                </button>
              </div>
            </FormField>

            <div className="rounded-lg border border-cream-200 bg-cream-50/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                Balance due
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tracking-tight ${
                  due !== null && due > 0 ? 'text-red-700' : 'text-ink-900'
                }`}
              >
                {due !== null ? formatINR2(due) : '—'}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {due !== null && due > 0
                  ? `Outstanding after ${formatINR2(paidValue)} received`
                  : 'Settled in full'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <FormField
              label="Notes"
              htmlFor="invoice-notes"
              error={errors.notes}
              hint="Optional. Printed on the invoice. Up to 500 characters."
            >
              <textarea
                id="invoice-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Delivery or transport details"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrors((previous) => ({ ...previous, notes: '' }));
                }}
              />
            </FormField>
          </div>

          <button type="submit" className="btn-primary mt-5 w-full" disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner /> Saving invoice...
              </>
            ) : (
              `Save invoice${total !== null ? ` · ${formatINR2(total)}` : ''}`
            )}
          </button>
        </form>

        <aside className="min-w-0 space-y-4">
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-ink-900">Invoice summary</h2>
              <span className={`pill ${statusMeta.pillClass}`}>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                  aria-hidden="true"
                />
                {statusMeta.label}
              </span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Party</dt>
                <dd className="max-w-[60%] truncate text-right font-medium text-ink-900">
                  {selectedParty?.name ?? '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Phone</dt>
                <dd className="font-medium text-ink-900">{selectedParty?.phone ?? '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Outstanding</dt>
                <dd className="font-medium text-ink-900">
                  {selectedParty ? formatINR2(selectedPartyBalance) : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Credit limit</dt>
                <dd className="font-medium text-ink-900">
                  {selectedParty && Number(selectedParty.creditLimit) > 0
                    ? formatINR2(selectedParty.creditLimit)
                    : selectedParty
                      ? 'No limit'
                      : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Product</dt>
                <dd className="font-medium text-ink-900">{selectedProduct?.name ?? '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Quantity</dt>
                <dd className="font-medium text-ink-900">
                  {quantityValue !== null && quantityValue > 0
                    ? `${formatQuantity(quantityValue)} ${unit}`
                    : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Available stock</dt>
                <dd className="font-medium text-ink-900">
                  {selectedStock ? `${formatQuantity(selectedStock.quantity)} ${unit}` : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Payment</dt>
                <dd className="font-medium text-ink-900">
                  {getPaymentLabel(paymentMethod)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 space-y-2 border-t border-cream-200 pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-500">Total</span>
                <span className="font-semibold text-ink-900">
                  {total !== null ? formatINR2(total) : '—'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-500">Paid</span>
                <span className="font-semibold text-emerald-700">{formatINR2(paidValue)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-ink-700">Due</span>
                <span className="text-xl font-semibold tracking-tight text-ink-900">
                  {due !== null ? formatINR2(due) : '—'}
                </span>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-ink-900">How invoices work</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              The next invoice number is assigned on save and the sold quantity is deducted from
              stock automatically.
            </p>
            <div className="mt-3 rounded-lg bg-cream-50 px-3 py-2 text-xs text-ink-500">
              Invoice numbers start at INV-000001 and continue sequentially.
            </div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-600"
              onClick={() => setTab('history')}
            >
              View invoice history
              <NavIcon name="arrowRight" className="h-4 w-4" />
            </button>
          </section>
        </aside>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Invoice sales"
          icon="wholesale"
          value={summary?.total ?? null}
          formatValue={formatINR2}
          hint={`${summary?.count ?? 0} ${summary?.count === 1 ? 'invoice' : 'invoices'} shown`}
        />
        <StatCard
          title="Amount received"
          icon="cashbook"
          value={summary?.paid ?? null}
          formatValue={formatINR2}
          hint="Paid against these invoices"
        />
        <StatCard
          title="Balance due"
          icon="loans"
          value={summary?.due ?? null}
          formatValue={formatINR2}
          hint="Outstanding from these invoices"
        />
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-cream-200 bg-cream-50/60 px-5 py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <FormField label="Search" htmlFor="invoice-search">
              <input
                id="invoice-search"
                type="search"
                className="field-input"
                placeholder="Invoice number, party name or phone"
                value={search}
                onChange={handleFilterChange(setSearch)}
              />
            </FormField>
            <FormField label="From date" htmlFor="invoice-from">
              <input
                id="invoice-from"
                type="date"
                className="field-input"
                value={fromDate}
                onChange={handleFilterChange(setFromDate)}
              />
            </FormField>
            <FormField label="To date" htmlFor="invoice-to">
              <input
                id="invoice-to"
                type="date"
                className="field-input"
                value={toDate}
                onChange={handleFilterChange(setToDate)}
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

        {isLoadingHistory ? (
          <div className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-ink-500">
            <Spinner className="h-4 w-4 text-brand-600" />
            Loading invoices...
          </div>
        ) : historyError ? (
          <div className="px-5 py-10">
            <h2 className="text-base font-semibold text-ink-900">Invoices could not be loaded</h2>
            <p className="mt-1 text-sm text-ink-500">{historyError}</p>
            <button type="button" className="btn-secondary mt-4" onClick={refreshHistory}>
              Try again
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <h2 className="text-base font-semibold text-ink-900">
              {hasFilters ? 'No matching invoices' : 'No wholesale invoices yet'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              {hasFilters
                ? 'Try a different search term or date range.'
                : 'The first saved invoice will appear here with its paid and due amounts.'}
            </p>
            {hasFilters ? (
              <button type="button" className="btn-secondary mt-4" onClick={clearFilters}>
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => setTab('new')}
              >
                New invoice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
                <tr className="border-b border-cream-200">
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Invoice
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Party
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Paid
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Due
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
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="text-ink-900">{formatReceiptDate(invoice.createdAt)}</p>
                      <p className="text-[11px] text-ink-400">
                        {formatReceiptTime(invoice.createdAt)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink-900">{invoice.partyName}</p>
                      <p className="text-xs text-ink-400">{invoice.partyPhone}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-ink-900">
                      {formatINR2(invoice.total)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-emerald-700">
                      {formatINR2(invoice.paid)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-red-700">
                      {formatINR2(invoice.due)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={invoice.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        className="rounded-md border border-cream-300 px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                        onClick={() => openInvoice(invoice)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-cream-200 px-5 py-3 text-[11px] text-ink-400 sm:hidden">
              Swipe the table sideways to see totals, paid, due and status.
            </p>
          </div>
        )}
      </section>

      <p className="px-1 text-xs text-ink-400">
        Showing the latest {ROW_LIMIT} invoices. Search matches invoice number, party name or phone.
        Open a party from Parties to see its full ledger, outstanding balance and payment reminders.
      </p>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Wholesale Invoices"
        description="Raise a wholesale invoice for a party, record the amount received and track the balance due. Stock is deducted when the invoice is saved."
      />

      <div className="mb-5 inline-flex rounded-lg border border-cream-300 bg-white p-0.5">
        <button
          type="button"
          aria-pressed={tab === 'new'}
          onClick={() => setTab('new')}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
            tab === 'new' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-cream-100'
          }`}
        >
          New invoice
        </button>
        <button
          type="button"
          aria-pressed={tab === 'history'}
          onClick={() => setTab('history')}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
            tab === 'history' ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-cream-100'
          }`}
        >
          Invoice history
        </button>
      </div>

      {tab === 'new' ? renderBilling() : renderHistory()}

      {isPartyDialogOpen ? (
        <PartyFormDialog
          onClose={() => setIsPartyDialogOpen(false)}
          onSaved={handlePartySaved}
        />
      ) : null}

      {invoiceDialog ? (
        <WholesaleInvoiceDialog
          invoice={invoiceDialog}
          mode={invoiceDialogMode}
          onClose={closeInvoiceDialog}
          onNewInvoice={handleNewInvoice}
        />
      ) : null}
    </div>
  );
};

export default WholesalePage;
