import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { createBankAccountApi, updateBankAccountApi } from '../services/bankAccountService';
import { getApiErrorMessage } from '../utils/errors';
import { fieldInputClass } from '../utils/formStyles';

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const BankAccountFormDialog = ({ account = null, onClose, onSaved }) => {
  const isEdit = Boolean(account);
  const [bankName, setBankName] = useState(account?.bankName ?? '');
  const [accountName, setAccountName] = useState(account?.accountName ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState(
    account ? String(account.openingBalance ?? 0) : '',
  );
  const [active, setActive] = useState(account ? account.active !== false : true);
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    const balanceValue = Number(openingBalance);
    const numberText = accountNumber.replace(/[\s-]/g, '');

    if (!bankName.trim()) {
      nextErrors.bankName = 'Enter the bank name.';
    }

    if (!accountName.trim()) {
      nextErrors.accountName = 'Enter the account name.';
    }

    if (!isEdit && !numberText) {
      nextErrors.accountNumber = 'Enter the account number.';
    }

    if (numberText && !/^[A-Za-z0-9]{4,34}$/.test(numberText)) {
      nextErrors.accountNumber = 'Use 4 to 34 letters or digits.';
    }

    if (openingBalance.trim() === '' || !Number.isFinite(balanceValue) || balanceValue < 0) {
      nextErrors.openingBalance = 'Enter an opening balance of 0 or more.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        openingBalance: roundMoney(balanceValue),
        active,
      };

      if (numberText) {
        payload.accountNumber = numberText;
      }

      const data = isEdit
        ? await updateBankAccountApi(account._id, payload)
        : await createBankAccountApi(payload);

      toast.success(isEdit ? 'Bank account updated.' : `Bank account for ${data.account.bankName} added.`);
      onSaved(data.account);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          isEdit ? 'Unable to update the bank account.' : 'Unable to add the bank account.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-account-dialog-title"
        className="my-6 w-full max-w-lg rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="bank-account-dialog-title" className="text-lg font-semibold text-ink-900">
              {isEdit ? 'Edit bank account' : 'Add bank account'}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {isEdit
                ? 'Leave the account number blank to keep the current number.'
                : 'The account number is masked everywhere after saving.'}
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
                label="Bank name"
                htmlFor="bank-name"
                error={errors.bankName}
                required
              >
                <input
                  id="bank-name"
                  type="text"
                  maxLength={100}
                  autoFocus
                  className={fieldInputClass(Boolean(errors.bankName))}
                  placeholder="SBI"
                  value={bankName}
                  onChange={(event) => {
                    setBankName(event.target.value);
                    setErrors((previous) => ({ ...previous, bankName: '' }));
                  }}
                />
              </FormField>

              <FormField
                label="Account name"
                htmlFor="bank-account-name"
                error={errors.accountName}
                required
              >
                <input
                  id="bank-account-name"
                  type="text"
                  maxLength={150}
                  className={fieldInputClass(Boolean(errors.accountName))}
                  placeholder="Tirupati Muri Mill"
                  value={accountName}
                  onChange={(event) => {
                    setAccountName(event.target.value);
                    setErrors((previous) => ({ ...previous, accountName: '' }));
                  }}
                />
              </FormField>
            </div>

            <FormField
              label="Account number"
              htmlFor="bank-account-number"
              error={errors.accountNumber}
              hint={
                isEdit
                  ? `Current number: ${account?.maskedAccountNumber ?? 'hidden'}`
                  : 'Spaces and dashes are ignored.'
              }
              required={!isEdit}
            >
              <input
                id="bank-account-number"
                type="text"
                maxLength={40}
                autoComplete="off"
                className={fieldInputClass(Boolean(errors.accountNumber))}
                placeholder={isEdit ? 'Leave blank to keep the current number' : '12345678901'}
                value={accountNumber}
                onChange={(event) => {
                  setAccountNumber(event.target.value);
                  setErrors((previous) => ({ ...previous, accountNumber: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Opening balance"
              htmlFor="bank-opening-balance"
              error={errors.openingBalance}
              hint="Balance in this account before any recorded transactions."
              required
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  ₹
                </span>
                <input
                  id="bank-opening-balance"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className={`${fieldInputClass(Boolean(errors.openingBalance))} pl-8`}
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(event) => {
                    setOpeningBalance(event.target.value);
                    setErrors((previous) => ({ ...previous, openingBalance: '' }));
                  }}
                />
              </div>
            </FormField>

            {isEdit ? (
              <label className="flex items-start gap-3 rounded-lg border border-cream-200 bg-cream-50/70 px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-cream-300 text-brand-600 focus:ring-brand-500/40"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">
                    Account is active
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    Inactive accounts are hidden from payments, receipts and transfers, but their
                    ledger stays available.
                  </span>
                </span>
              </label>
            ) : null}
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
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Add account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankAccountFormDialog;
