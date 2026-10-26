import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { createExpenseApi, createExpenseCategoryApi } from '../services/expenseService';
import { getBankAccountsApi } from '../services/bankAccountService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, toDateInputValue } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', account: 'cash' },
  { value: 'upi', label: 'UPI', account: 'bank' },
  { value: 'bank', label: 'Bank', account: 'bank' },
];

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const ExpenseFormDialog = ({ categories = [], onCategoryAdded, onClose, onSaved }) => {
  const [expenseDate, setExpenseDate] = useState(() => toDateInputValue());
  const [categoryId, setCategoryId] = useState(() => categories[0]?._id ?? '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

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

  const account = PAYMENT_METHODS.find((method) => method.value === paymentMethod)?.account ?? 'cash';

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();

    if (!name) {
      setCategoryError('Enter a category name.');
      return;
    }

    if (name.length > 60) {
      setCategoryError('Category name cannot be longer than 60 characters.');
      return;
    }

    setIsSavingCategory(true);
    setCategoryError('');

    try {
      const data = await createExpenseCategoryApi({ name });
      toast.success(`Category "${data.category.name}" added.`);
      onCategoryAdded?.(data.category);
      setCategoryId(data.category._id);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (error) {
      setCategoryError(getApiErrorMessage(error, 'Unable to add the category.'));
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const amountValue = Number(amount);
    const nextErrors = {};

    if (!categoryId) {
      nextErrors.category = 'Select an expense category.';
    }

    if (!amount.trim() || !Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter an expense amount greater than 0.';
    }

    if (!expenseDate) {
      nextErrors.expenseDate = 'Select the expense date.';
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

    if (account === 'bank' && bankAccounts.length > 0 && !bankAccountId) {
      nextErrors.bankAccount = 'Select the bank account that paid.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const data = await createExpenseApi({
        categoryId,
        amount: roundMoney(amountValue),
        paymentMethod,
        account,
        bankAccountId: account === 'bank' ? bankAccountId || undefined : undefined,
        expenseDate,
        description: description.trim(),
        notes: notes.trim(),
      });

      toast.success(`Expense ${data.expense.expenseNumber} recorded.`);
      onSaved(data.expense);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record the expense.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-dialog-title"
        className="my-6 w-full max-w-lg rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="expense-dialog-title" className="text-lg font-semibold text-ink-900">
              Add expense
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Cash expenses reduce the cash book; UPI and bank expenses reduce the selected bank
              account.
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
                label="Expense date"
                htmlFor="expense-date"
                error={errors.expenseDate}
                required
              >
                <input
                  id="expense-date"
                  type="date"
                  max={toDateInputValue()}
                  className={fieldInputClass(Boolean(errors.expenseDate))}
                  value={expenseDate}
                  onChange={(event) => {
                    setExpenseDate(event.target.value);
                    setErrors((previous) => ({ ...previous, expenseDate: '' }));
                  }}
                />
              </FormField>

              <FormField label="Amount" htmlFor="expense-amount" error={errors.amount} required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                    ₹
                  </span>
                  <input
                    id="expense-amount"
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

            <FormField
              label="Category"
              htmlFor="expense-category"
              error={errors.category}
              required
            >
              <div className="flex gap-2">
                <select
                  id="expense-category"
                  className={`${fieldInputClass(Boolean(errors.category))} flex-1`}
                  value={categoryId}
                  disabled={categories.length === 0}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setErrors((previous) => ({ ...previous, category: '' }));
                  }}
                >
                  {categories.length === 0 ? (
                    <option value="">No categories yet</option>
                  ) : (
                    categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  className="btn-secondary shrink-0 px-3"
                  onClick={() => {
                    setIsAddingCategory((value) => !value);
                    setCategoryError('');
                  }}
                >
                  {isAddingCategory ? 'Close' : 'Add'}
                </button>
              </div>
            </FormField>

            {isAddingCategory ? (
              <div className="rounded-lg border border-cream-200 bg-cream-50/70 p-3">
                <p className="text-xs font-semibold text-ink-700">New expense category</p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    maxLength={60}
                    className={fieldInputClass(Boolean(categoryError))}
                    placeholder="e.g. Telephone"
                    value={newCategoryName}
                    onChange={(event) => {
                      setNewCategoryName(event.target.value);
                      setCategoryError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary shrink-0 px-3"
                    onClick={handleAddCategory}
                    disabled={isSavingCategory}
                  >
                    {isSavingCategory ? <Spinner /> : 'Save'}
                  </button>
                </div>
                {categoryError ? (
                  <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                    {categoryError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <p className="field-label">Payment method</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
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
                Paid from the {account === 'cash' ? 'cash' : 'bank'} account.
              </p>
            </div>

            {account === 'bank' ? (
              bankAccounts.length > 0 ? (
                <FormField
                  label="Paid from bank account"
                  htmlFor="expense-bank-account"
                  error={errors.bankAccount}
                  hint="The selected account balance will be reduced."
                  required
                >
                  <select
                    id="expense-bank-account"
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
                  No active bank accounts yet. Add one from Bank Accounts to reduce a bank balance
                  with this expense.
                </p>
              )
            ) : null}

            <FormField
              label="Description"
              htmlFor="expense-description"
              error={errors.description}
              required
            >
              <input
                id="expense-description"
                type="text"
                maxLength={200}
                className={fieldInputClass(Boolean(errors.description))}
                placeholder="Diesel for the delivery van"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((previous) => ({ ...previous, description: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Notes"
              htmlFor="expense-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="expense-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Paid in cash at the fuel station"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrors((previous) => ({ ...previous, notes: '' }));
                }}
              />
            </FormField>
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
                'Record expense'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseFormDialog;
