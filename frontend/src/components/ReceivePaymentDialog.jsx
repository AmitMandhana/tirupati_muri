import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { receivePaymentApi } from '../services/partyService';
import { getBankAccountsApi } from '../services/bankAccountService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2 } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const RECEIPT_METHODS = [
  { value: 'cash', label: 'Cash', account: 'cash' },
  { value: 'upi', label: 'UPI', account: 'bank' },
  { value: 'bank', label: 'Bank', account: 'bank' },
];

const todayValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const ReceivePaymentDialog = ({ party, outstanding, onClose, onSaved }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayValue);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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

  const amountValue = Number(amount);
  const hasAmount = amount.trim() !== '' && Number.isFinite(amountValue) && amountValue > 0;
  const remaining = hasAmount ? roundMoney(Number(outstanding) - amountValue) : null;
  const account = RECEIPT_METHODS.find((method) => method.value === paymentMethod)?.account ?? 'cash';

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!amount.trim() || !Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a payment amount greater than 0.';
    }

    if (!paymentDate) {
      nextErrors.paymentDate = 'Select the payment date.';
    }

    if (notes.trim().length > 500) {
      nextErrors.notes = 'Notes cannot be longer than 500 characters.';
    }

    if (account === 'bank' && bankAccounts.length > 0 && !bankAccountId) {
      nextErrors.bankAccount = 'Select the bank account that received the payment.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const data = await receivePaymentApi(party._id, {
        amount: roundMoney(amountValue),
        paymentMethod,
        account,
        bankAccountId: account === 'bank' ? bankAccountId || undefined : undefined,
        paymentDate,
        notes: notes.trim(),
      });

      toast.success(`Payment ${data.payment.paymentNumber} recorded.`);
      onSaved(data.payment, data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record the payment.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-dialog-title"
        className="my-6 w-full max-w-md rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="payment-dialog-title" className="text-lg font-semibold text-ink-900">
              Receive payment
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              The payment is added to the party ledger and the outstanding balance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <NavIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-lg border border-cream-200 bg-cream-50/70 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">{party.name}</p>
              <p className="mt-0.5 text-xs text-ink-500">{party.phone}</p>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-500">Current outstanding</span>
                <span className="text-base font-semibold text-red-700">
                  {formatINR2(outstanding)}
                </span>
              </div>
            </div>

            <FormField label="Amount received" htmlFor="payment-amount" error={errors.amount} required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  ₹
                </span>
                <input
                  id="payment-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  autoFocus
                  className={`${fieldInputClass(Boolean(errors.amount))} pl-8`}
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setErrors((previous) => ({ ...previous, amount: '' }));
                  }}
                />
              </div>
              {Number(outstanding) > 0 ? (
                <button
                  type="button"
                  className="mt-2 rounded-md border border-cream-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                  onClick={() => {
                    setAmount(String(roundMoney(Number(outstanding))));
                    setErrors((previous) => ({ ...previous, amount: '' }));
                  }}
                >
                  Full outstanding
                </button>
              ) : null}
            </FormField>

            <div>
              <p className="field-label">Payment method</p>
              <div className="grid grid-cols-3 gap-2">
                {RECEIPT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    aria-pressed={paymentMethod === method.value}
                    onClick={() => setPaymentMethod(method.value)}
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
              <p className="mt-1.5 text-xs text-ink-400">
                Received into the {account === 'cash' ? 'cash' : 'bank'} account.
              </p>
            </div>

            {account === 'bank' ? (
              bankAccounts.length > 0 ? (
                <FormField
                  label="Received into bank account"
                  htmlFor="payment-bank-account"
                  error={errors.bankAccount}
                  hint="The selected account balance will increase."
                  required
                >
                  <select
                    id="payment-bank-account"
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
                  No active bank accounts yet. Add one from Bank Accounts to increase a bank balance
                  with this payment.
                </p>
              )
            ) : null}

            <FormField
              label="Payment date"
              htmlFor="payment-date"
              error={errors.paymentDate}
              required
            >
              <input
                id="payment-date"
                type="date"
                max={todayValue()}
                className={fieldInputClass(Boolean(errors.paymentDate))}
                value={paymentDate}
                onChange={(event) => {
                  setPaymentDate(event.target.value);
                  setErrors((previous) => ({ ...previous, paymentDate: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Notes"
              htmlFor="payment-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="payment-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Cash received at the mill"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrors((previous) => ({ ...previous, notes: '' }));
                }}
              />
            </FormField>

            <div className="rounded-lg border border-cream-200 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-500">Outstanding after payment</span>
                <span
                  className={`text-lg font-semibold ${
                    remaining !== null && remaining < 0 ? 'text-emerald-700' : 'text-ink-900'
                  }`}
                >
                  {remaining === null
                    ? '—'
                    : remaining < 0
                      ? `Advance ${formatINR2(Math.abs(remaining))}`
                      : formatINR2(remaining)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-cream-200 bg-cream-50/70 px-6 py-4">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner /> Saving...
                </>
              ) : (
                'Record payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceivePaymentDialog;
