import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { updateOpeningCashApi } from '../services/cashBookService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, formatReceiptDate, toDateInputValue } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const OpeningCashDialog = ({ opening, onClose, onSaved }) => {
  const [openingCash, setOpeningCash] = useState(String(opening?.balance ?? 0));
  const [openingDate, setOpeningDate] = useState(() =>
    opening?.date ? toDateInputValue(opening.date) : toDateInputValue(),
  );
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

    const amountValue = Number(openingCash);
    const nextErrors = {};

    if (!openingCash.trim() || !Number.isFinite(amountValue) || amountValue < 0) {
      nextErrors.openingCash = 'Enter an opening cash amount of 0 or more.';
    }

    if (!openingDate) {
      nextErrors.openingDate = 'Select the opening cash date.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const data = await updateOpeningCashApi({
        openingCash: roundMoney(amountValue),
        openingDate,
      });

      toast.success('Opening cash saved.');
      onSaved(data.opening);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save the opening cash.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="opening-dialog-title"
        className="my-6 w-full max-w-md rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="opening-dialog-title" className="text-lg font-semibold text-ink-900">
              Opening cash
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              The cash on hand at the start of the opening date.
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
            <FormField
              label="Opening cash amount"
              htmlFor="opening-cash"
              error={errors.openingCash}
              required
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  ₹
                </span>
                <input
                  id="opening-cash"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  autoFocus
                  className={`${fieldInputClass(Boolean(errors.openingCash))} pl-8`}
                  placeholder="0.00"
                  value={openingCash}
                  onChange={(event) => {
                    setOpeningCash(event.target.value);
                    setErrors((previous) => ({ ...previous, openingCash: '' }));
                  }}
                />
              </div>
            </FormField>

            <FormField
              label="Opening date"
              htmlFor="opening-date"
              error={errors.openingDate}
              required
              hint="Cash movements before this date are excluded from the cash book."
            >
              <input
                id="opening-date"
                type="date"
                max={toDateInputValue()}
                className={fieldInputClass(Boolean(errors.openingDate))}
                value={openingDate}
                onChange={(event) => {
                  setOpeningDate(event.target.value);
                  setErrors((previous) => ({ ...previous, openingDate: '' }));
                }}
              />
            </FormField>

            <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3">
              <p className="text-xs leading-relaxed text-ink-600">
                Opening cash is added to cash sales, collections, other income, and reduced by cash
                expenses, staff payments, loan payments and other cash outflows. Changing it
                recalculates every cash book summary.
              </p>
            </div>

            {opening?.balance > 0 && opening?.date ? (
              <p className="text-xs text-ink-500">
                Current opening: {formatINR2(opening.balance)} from{' '}
                {formatReceiptDate(opening.date)}.
              </p>
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
              ) : (
                'Save opening cash'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpeningCashDialog;
