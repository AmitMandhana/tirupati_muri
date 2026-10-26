import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { getBankAccountsApi } from '../services/bankAccountService';
import { addStaffTransactionApi } from '../services/staffService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, toDateInputValue } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const TRANSACTION_TYPES = [
  { value: 'salary', label: 'Salary', hint: 'Add monthly salary to payable' },
  { value: 'advance', label: 'Advance', hint: 'Paid before salary is due' },
  { value: 'payment', label: 'Payment', hint: 'Pay the remaining salary' },
  { value: 'bonus', label: 'Bonus', hint: 'Extra amount added to payable' },
  { value: 'deduction', label: 'Deduction', hint: 'Reduce the payable amount' },
  { value: 'recovery', label: 'Recovery', hint: 'Recover an earlier advance' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', account: 'cash' },
  { value: 'upi', label: 'UPI', account: 'bank' },
  { value: 'bank', label: 'Bank', account: 'bank' },
];

const PLACEHOLDERS = {
  salary: 'Monthly salary',
  advance: 'Advance paid',
  payment: 'Salary payment',
  bonus: 'Bonus',
  deduction: 'Deduction',
  recovery: 'Loan / advance recovery',
};

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const StaffTransactionDialog = ({ staff, defaultType = 'payment', onClose, onSaved }) => {
  const initialType = TRANSACTION_TYPES.some((item) => item.value === defaultType)
    ? defaultType
    : 'payment';
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState(
    initialType === 'salary' && staff?.monthlySalary ? String(staff.monthlySalary) : '',
  );
  const [salaryMonth, setSalaryMonth] = useState(toDateInputValue().slice(0, 7));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [transactionDate, setTransactionDate] = useState(toDateInputValue);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const isPayment = type === 'advance' || type === 'payment';
  const isSalary = type === 'salary';
  const account =
    PAYMENT_METHODS.find((method) => method.value === paymentMethod)?.account ?? 'cash';

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
          (item) => item.active,
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
  const currentRemaining = Number(staff?.totals?.remainingPayable ?? 0);
  const direction = isSalary || type === 'bonus' ? 1 : -1;
  const projectedRemaining = hasAmount
    ? roundMoney(currentRemaining + direction * amountValue)
    : null;

  const selectType = (value) => {
    setType(value);
    setErrors((previous) => ({ ...previous, amount: '' }));

    if (value === 'salary' && !amount.trim() && Number(staff?.monthlySalary) > 0) {
      setAmount(String(staff.monthlySalary));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!amount.trim() || !Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = 'Enter an amount greater than 0.';
    }

    if (isSalary && !salaryMonth) {
      nextErrors.salaryMonth = 'Select the salary month.';
    }

    if (!transactionDate) {
      nextErrors.transactionDate = 'Select the transaction date.';
    }

    if (description.trim().length > 200) {
      nextErrors.description = 'Description cannot be longer than 200 characters.';
    }

    if (notes.trim().length > 500) {
      nextErrors.notes = 'Notes cannot be longer than 500 characters.';
    }

    if (account === 'bank' && bankAccounts.length > 0 && !bankAccountId) {
      nextErrors.bankAccount = 'Select the bank account that paid this amount.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const data = await addStaffTransactionApi(staff._id, {
        type,
        amount: roundMoney(amountValue),
        transactionDate,
        salaryMonth: isSalary ? salaryMonth : undefined,
        description: description.trim(),
        notes: notes.trim(),
        ...(isPayment
          ? {
              paymentMethod,
              account,
              bankAccountId: account === 'bank' ? bankAccountId || undefined : undefined,
            }
          : {}),
      });

      toast.success(`Entry ${data.transaction.transactionNumber} recorded.`);
      onSaved(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record the staff transaction.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-transaction-dialog-title"
        className="my-6 w-full max-w-lg rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="staff-transaction-dialog-title" className="text-lg font-semibold text-ink-900">
              Add staff entry
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {staff.name} · Remaining payable {formatINR2(currentRemaining)}
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
            <div>
              <p className="field-label">Entry type</p>
              <div className="grid grid-cols-3 gap-2">
                {TRANSACTION_TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={type === item.value}
                    onClick={() => selectType(item.value)}
                    className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                      type === item.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-cream-300 bg-white text-ink-700 hover:bg-cream-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-400">
                {TRANSACTION_TYPES.find((item) => item.value === type)?.hint}
              </p>
            </div>

            {isSalary ? (
              <FormField
                label="Salary month"
                htmlFor="staff-salary-month"
                error={errors.salaryMonth}
                hint="One salary entry is allowed per month."
                required
              >
                <input
                  id="staff-salary-month"
                  type="month"
                  max={toDateInputValue().slice(0, 7)}
                  className={fieldInputClass(Boolean(errors.salaryMonth))}
                  value={salaryMonth}
                  onChange={(event) => {
                    setSalaryMonth(event.target.value);
                    setErrors((previous) => ({ ...previous, salaryMonth: '' }));
                  }}
                />
              </FormField>
            ) : null}

            <FormField label="Amount" htmlFor="staff-amount" error={errors.amount} required>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  ₹
                </span>
                <input
                  id="staff-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  autoFocus={!isSalary}
                  className={`${fieldInputClass(Boolean(errors.amount))} pl-8`}
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setErrors((previous) => ({ ...previous, amount: '' }));
                  }}
                />
              </div>
              {isPayment && currentRemaining > 0 ? (
                <button
                  type="button"
                  className="mt-2 rounded-md border border-cream-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 transition-colors hover:bg-cream-50"
                  onClick={() => {
                    setAmount(String(roundMoney(currentRemaining)));
                    setErrors((previous) => ({ ...previous, amount: '' }));
                  }}
                >
                  Full remaining payable
                </button>
              ) : null}
            </FormField>

            {isPayment ? (
              <div>
                <p className="field-label">Paid by</p>
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
                  Paid from the {account === 'cash' ? 'cash account' : 'bank account'}.
                </p>
              </div>
            ) : null}

            {isPayment && account === 'bank' ? (
              bankAccounts.length > 0 ? (
                <FormField
                  label="Paid from bank account"
                  htmlFor="staff-bank-account"
                  error={errors.bankAccount}
                  hint="The selected account balance will decrease."
                  required
                >
                  <select
                    id="staff-bank-account"
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
                  with this payment.
                </p>
              )
            ) : null}

            <FormField
              label="Transaction date"
              htmlFor="staff-transaction-date"
              error={errors.transactionDate}
              required
            >
              <input
                id="staff-transaction-date"
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
              htmlFor="staff-description"
              error={errors.description}
              hint="Optional. Defaults to the entry type."
            >
              <input
                id="staff-description"
                type="text"
                maxLength={200}
                className={fieldInputClass(Boolean(errors.description))}
                placeholder={PLACEHOLDERS[type]}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((previous) => ({ ...previous, description: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Notes"
              htmlFor="staff-transaction-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="staff-transaction-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Paid in cash at the mill"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrors((previous) => ({ ...previous, notes: '' }));
                }}
              />
            </FormField>

            <div className="rounded-lg border border-cream-200 bg-cream-50/60 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-500">Remaining payable after this entry</span>
                <span
                  className={`text-lg font-semibold ${
                    projectedRemaining !== null && projectedRemaining < -0.005
                      ? 'text-emerald-700'
                      : 'text-ink-900'
                  }`}
                >
                  {projectedRemaining === null
                    ? '—'
                    : projectedRemaining < -0.005
                      ? `Advance ${formatINR2(Math.abs(projectedRemaining))}`
                      : formatINR2(projectedRemaining)}
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
                'Record entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffTransactionDialog;
