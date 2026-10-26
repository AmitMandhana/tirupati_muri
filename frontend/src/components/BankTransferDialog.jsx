import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { transferFundsApi } from '../services/bankAccountService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, toDateInputValue } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const BankTransferDialog = ({ accounts = [], defaultFromId = '', onClose, onSaved }) => {
  const activeAccounts = accounts.filter((account) => account.active);

  const [fromAccountId, setFromAccountId] = useState(() => {
    if (defaultFromId && activeAccounts.some((account) => account._id === defaultFromId)) {
      return defaultFromId;
    }

    return activeAccounts[0]?._id ?? '';
  });
  const [toAccountId, setToAccountId] = useState(
    () => activeAccounts.find((account) => account._id !== defaultFromId)?._id ?? '',
  );
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => toDateInputValue());
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

  const fromAccount = activeAccounts.find((account) => account._id === fromAccountId) ?? null;
  const toAccount = activeAccounts.find((account) => account._id === toAccountId) ?? null;
  const amountValue = Number(amount);
  const hasAmount = amount.trim() !== '' && Number.isFinite(amountValue) && amountValue > 0;
  const fromAfter =
    fromAccount && hasAmount ? roundMoney(Number(fromAccount.balance ?? 0) - amountValue) : null;
  const toAfter =
    toAccount && hasAmount ? roundMoney(Number(toAccount.balance ?? 0) + amountValue) : null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!fromAccountId) {
      nextErrors.fromAccountId = 'Select the account to transfer from.';
    }

    if (!toAccountId) {
      nextErrors.toAccountId = 'Select the account to transfer to.';
    } else if (fromAccountId && fromAccountId === toAccountId) {
      nextErrors.toAccountId = 'Choose two different bank accounts.';
    }

    if (!amount.trim() || !Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter a transfer amount greater than 0.';
    }

    if (!transactionDate) {
      nextErrors.transactionDate = 'Select the transfer date.';
    }

    if (notes.trim().length > 500) {
      nextErrors.notes = 'Notes cannot be longer than 500 characters.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const data = await transferFundsApi({
        fromAccountId,
        toAccountId,
        amount: roundMoney(amountValue),
        transactionDate,
        notes: notes.trim(),
      });

      toast.success(data.message ?? `Transfer ${data.transfer.transferNumber} recorded.`);
      onSaved(data.transfer);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record the transfer.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-transfer-dialog-title"
        className="my-6 w-full max-w-lg rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="bank-transfer-dialog-title" className="text-lg font-semibold text-ink-900">
              Transfer between accounts
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              The total business money does not change, only the split between accounts.
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

        {activeAccounts.length < 2 ? (
          <div className="px-6 py-8">
            <p className="text-sm text-ink-500">
              Add at least two active bank accounts before recording a transfer.
            </p>
            <button type="button" className="btn-secondary mt-4" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="From account"
                  htmlFor="transfer-from"
                  error={errors.fromAccountId}
                  required
                >
                  <select
                    id="transfer-from"
                    className={fieldInputClass(Boolean(errors.fromAccountId))}
                    value={fromAccountId}
                    onChange={(event) => {
                      setFromAccountId(event.target.value);
                      setErrors((previous) => ({
                        ...previous,
                        fromAccountId: '',
                        toAccountId: '',
                      }));
                    }}
                  >
                    {activeAccounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.bankName} · {account.maskedAccountNumber}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="To account"
                  htmlFor="transfer-to"
                  error={errors.toAccountId}
                  required
                >
                  <select
                    id="transfer-to"
                    className={fieldInputClass(Boolean(errors.toAccountId))}
                    value={toAccountId}
                    onChange={(event) => {
                      setToAccountId(event.target.value);
                      setErrors((previous) => ({ ...previous, toAccountId: '' }));
                    }}
                  >
                    {activeAccounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.bankName} · {account.maskedAccountNumber}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Transfer amount"
                  htmlFor="transfer-amount"
                  error={errors.amount}
                  required
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                      ₹
                    </span>
                    <input
                      id="transfer-amount"
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

                <FormField
                  label="Transfer date"
                  htmlFor="transfer-date"
                  error={errors.transactionDate}
                  required
                >
                  <input
                    id="transfer-date"
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
              </div>

              <FormField
                label="Notes"
                htmlFor="transfer-notes"
                error={errors.notes}
                hint="Optional. Up to 500 characters."
              >
                <textarea
                  id="transfer-notes"
                  rows={2}
                  maxLength={500}
                  className={fieldInputClass(Boolean(errors.notes))}
                  placeholder="Why the funds were moved"
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setErrors((previous) => ({ ...previous, notes: '' }));
                  }}
                />
              </FormField>

              <div className="rounded-lg border border-cream-200 bg-cream-50/70 px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-500">{fromAccount?.bankName ?? 'From'}</span>
                  <span className="font-semibold text-ink-900">
                    {fromAfter === null ? '—' : formatINR2(fromAfter)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-ink-500">{toAccount?.bankName ?? 'To'}</span>
                  <span className="font-semibold text-ink-900">
                    {toAfter === null ? '—' : formatINR2(toAfter)}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-400">Balance in each account after the transfer.</p>
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
                  'Transfer funds'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BankTransferDialog;
