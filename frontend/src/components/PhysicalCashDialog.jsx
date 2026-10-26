import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { recordCashCountApi } from '../services/cashBookService';
import { getApiErrorMessage } from '../utils/errors';
import { formatDateKeyLong, formatINR2 } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const PhysicalCashDialog = ({ cashBook, onClose, onSaved }) => {
  const expectedCash = roundMoney(Number(cashBook?.summary?.closingCash) || 0);
  const [physicalCash, setPhysicalCash] = useState('');
  const [adjustCashBook, setAdjustCashBook] = useState(true);
  const [reason, setReason] = useState('');
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

  const physicalValue = Number(physicalCash);
  const hasPhysical =
    physicalCash.trim() !== '' && Number.isFinite(physicalValue) && physicalValue >= 0;
  const difference = hasPhysical ? roundMoney(physicalValue - expectedCash) : null;
  const requiresReason =
    adjustCashBook && difference !== null && Math.abs(difference) >= 0.005;

  const differenceClass =
    difference === null
      ? 'text-ink-900'
      : difference > 0
        ? 'text-emerald-700'
        : difference < 0
          ? 'text-red-700'
          : 'text-ink-900';

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!hasPhysical) {
      nextErrors.physicalCash = 'Enter the physical cash counted.';
    }

    if (requiresReason && !reason.trim()) {
      nextErrors.reason = 'A reason is required when adjusting the cash book.';
    }

    if (reason.trim().length > 300) {
      nextErrors.reason = 'Reason cannot be longer than 300 characters.';
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
      const data = await recordCashCountApi({
        date: cashBook.date,
        physicalCash: roundMoney(physicalValue),
        adjustCashBook,
        reason: reason.trim(),
        notes: notes.trim(),
      });

      toast.success(
        data.count.adjusted
          ? `Physical cash recorded and cash book adjusted by ${formatINR2(data.count.difference)}.`
          : 'Physical cash recorded.',
      );
      onSaved(data.cashBook, data.count);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record the physical cash.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="physical-dialog-title"
        className="my-6 w-full max-w-md rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="physical-dialog-title" className="text-lg font-semibold text-ink-900">
              Physical cash count
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Count the cash drawer for {formatDateKeyLong(cashBook.date)}.
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
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-500">Expected cash</span>
                <span className="text-base font-semibold text-ink-900">
                  {formatINR2(expectedCash)}
                </span>
              </div>
            </div>

            <FormField
              label="Physical cash counted"
              htmlFor="physical-cash"
              error={errors.physicalCash}
              required
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  ₹
                </span>
                <input
                  id="physical-cash"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  autoFocus
                  className={`${fieldInputClass(Boolean(errors.physicalCash))} pl-8`}
                  placeholder="0.00"
                  value={physicalCash}
                  onChange={(event) => {
                    setPhysicalCash(event.target.value);
                    setErrors((previous) => ({ ...previous, physicalCash: '' }));
                  }}
                />
              </div>
            </FormField>

            <div className="flex items-baseline justify-between gap-3 rounded-lg border border-cream-200 px-4 py-3">
              <span className="text-xs text-ink-500">Difference</span>
              <span className={`text-lg font-semibold ${differenceClass}`}>
                {difference === null ? '—' : formatINR2(difference)}
              </span>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-cream-200 px-4 py-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-cream-300 text-brand-600 focus:ring-2 focus:ring-brand-500/30"
                checked={adjustCashBook}
                onChange={(event) => setAdjustCashBook(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-ink-700">
                  Adjust cash book to match
                </span>
                <span className="mt-0.5 block text-xs text-ink-400">
                  A surplus becomes other cash income; a shortage becomes another cash outflow.
                </span>
              </span>
            </label>

            <FormField
              label="Reason"
              htmlFor="physical-reason"
              error={errors.reason}
              required={requiresReason}
              hint={
                requiresReason
                  ? undefined
                  : 'Optional unless the cash book is adjusted for a difference.'
              }
            >
              <input
                id="physical-reason"
                type="text"
                maxLength={300}
                className={fieldInputClass(Boolean(errors.reason))}
                placeholder="e.g. Change given to a customer was not recorded"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setErrors((previous) => ({ ...previous, reason: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Notes"
              htmlFor="physical-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="physical-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Counted with the owner at closing"
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
                'Record count'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PhysicalCashDialog;
