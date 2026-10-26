import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { addBankTransactionApi } from '../services/bankAccountService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, toDateInputValue } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const TRANSACTION_TYPES = [
  { value: 'deposit', label: 'Deposit', direction: 'inflow' },
  { value: 'withdrawal', label: 'Withdrawal', direction: 'outflow' },
  { value: 'sales-collection', label: 'Sales collection', direction: 'inflow' },
  { value: 'party-payment', label: 'Party payment', direction: 'inflow' },
  { value: 'expense', label: 'Expense', direction: 'outflow' },
  { value: 'loan-receipt', label: 'Loan receipt', direction: 'inflow' },
  { value: 'loan-repayment', label: 'Loan repayment', direction: 'outflow' },
  { value: 'other', label: 'Other', direction: null },
];

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const BankTransactionDialog = ({ account, onClose, onSaved }) => {
  const [type, setType] = useState('deposit');
  const [direction, setDirection] = useState('inflow');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => toDateInputValue());
  const [description, setDescription] = useState('');
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

  const selectedType = TRANSACTION_TYPES.find((item) => item.value === type);
  const isOther = type === 'other';
  const effectiveDirection = isOther ? direction : selectedType?.direction ?? 'inflow';
  const amountValue = Number(amount);
  const hasAmount = amount.trim() !== '' && Number.isFinite(amountValue) && amountValue > 0;
  const projectedBalance = hasAmount
    ? roundMoney(
        Number(account.balance ?? 0) + (effectiveDirection === 'inflow' ? amountValue : -amountValue),
      )
    : null;

  const handleTypeChange = (event) => {
    const nextType = event.target.value;
    const config = TRANSACTION_TYPES.find((item) => item.value === nextType);
    setType(nextType);

    if (config?.direction) {
      setDirection(config.direction);
    }

    setErrors((previous) => ({ ...previous, type: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!amount.trim() || !Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter an amount greater than 0.';
    }

    if (!transactionDate) {
      nextErrors.transactionDate = 'Select the transaction date.';
    }

    if (!description.trim()) {
      nextErrors.description = 'Enter a short description.';
    }

    if (description.trim().length > 200) {
      nextErrors.description = 'Description cannot be longer than 200 characters.';
    }

    if (notes.trim().length > 500) {
      nextErrors.notes = 'Notes cannot be longer than 500 characters.';
    }

    if (isOther && direction !== 'inflow' && direction !== 'outflow') {
      nextErrors.direction = 'Choose money in or money out.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const data = await addBankTransactionApi(account._id, {
        type,
        direction: isOther ? direction : undefined,
        amount: roundMoney(amountValue),
        transactionDate,
        description: description.trim(),
        notes: notes.trim(),
      });

      toast.success(`Transaction ${data.transaction.transactionNumber} recorded.`);
      onSaved(data.transaction);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record the bank transaction.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-transaction-dialog-title"
        className="my-6 w-full max-w-lg rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="bank-transaction-dialog-title" className="text-lg font-semibold text-ink-900">
              Record bank transaction
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {account.bankName} · {account.maskedAccountNumber}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Transaction type"
                htmlFor="bank-transaction-type"
                error={errors.type}
                required
              >
                <select
                  id="bank-transaction-type"
                  className={fieldInputClass(Boolean(errors.type))}
                  value={type}
                  onChange={handleTypeChange}
                >
                  {TRANSACTION_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Amount" htmlFor="bank-transaction-amount" error={errors.amount} required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                    ₹
                  </span>
                  <input
                    id="bank-transaction-amount"
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
              </FormField>
            </div>

            {isOther ? (
              <div>
                <p className="field-label">Direction</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'inflow', label: 'Money in' },
                    { value: 'outflow', label: 'Money out' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={direction === option.value}
                      onClick={() => {
                        setDirection(option.value);
                        setErrors((previous) => ({ ...previous, direction: '' }));
                      }}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                        direction === option.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-cream-300 bg-white text-ink-700 hover:bg-cream-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.direction ? (
                  <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                    {errors.direction}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-lg bg-cream-50 px-3 py-2 text-xs text-ink-500">
                This will {effectiveDirection === 'inflow' ? 'increase' : 'decrease'} the account
                balance.
              </p>
            )}

            <FormField
              label="Transaction date"
              htmlFor="bank-transaction-date"
              error={errors.transactionDate}
              required
            >
              <input
                id="bank-transaction-date"
                type="date"
                max={toDateInputValue()}
                className={fieldInputClass(Boolean(errors.transactionDate))}
                value={transactionDate}
                onChange={(event) => {
                  setTransactionDate(event.target.value);
                  setErrors((previous) => ({ ...previous, transactionDate: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="bank-transaction-description"
              error={errors.description}
              required
            >
              <input
                id="bank-transaction-description"
                type="text"
                maxLength={200}
                className={fieldInputClass(Boolean(errors.description))}
                placeholder="Cash deposited at the branch"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((previous) => ({ ...previous, description: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Notes"
              htmlFor="bank-transaction-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="bank-transaction-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Deposit slip number or remarks"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrors((previous) => ({ ...previous, notes: '' }));
                }}
              />
            </FormField>

            <div className="rounded-lg border border-cream-200 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-500">Current balance</span>
                <span className="text-sm font-semibold text-ink-900">
                  {formatINR2(account.balance ?? 0)}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-500">Balance after this entry</span>
                <span
                  className={`text-lg font-semibold ${
                    projectedBalance !== null && projectedBalance < 0
                      ? 'text-red-700'
                      : 'text-ink-900'
                  }`}
                >
                  {projectedBalance === null ? '—' : formatINR2(projectedBalance)}
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
                'Record transaction'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankTransactionDialog;
