import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { createProductionApi } from '../services/productionService';
import { getApiErrorMessage } from '../utils/errors';
import { formatINR2, formatQuantity, toDateInputValue } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';

const ProductionFormDialog = ({ onClose, onSaved }) => {
  const [productionDate, setProductionDate] = useState(() => toDateInputValue());
  const [rawMaterialKg, setRawMaterialKg] = useState('');
  const [finishedKg, setFinishedKg] = useState('');
  const [wastageKg, setWastageKg] = useState('');
  const [productionCost, setProductionCost] = useState('');
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

  const rawValue = Number(rawMaterialKg);
  const finishedValue = Number(finishedKg);
  const hasRaw = rawMaterialKg.trim() !== '' && Number.isFinite(rawValue) && rawValue > 0;
  const hasFinished =
    finishedKg.trim() !== '' && Number.isFinite(finishedValue) && finishedValue > 0;
  const yieldPercent = hasRaw && hasFinished ? (finishedValue / rawValue) * 100 : null;
  const rawPerKg = hasRaw && hasFinished ? rawValue / finishedValue : null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!productionDate) {
      nextErrors.productionDate = 'Select the production date.';
    }

    if (!hasRaw) {
      nextErrors.rawMaterialKg = 'Enter a raw material quantity greater than 0.';
    }

    if (!hasFinished) {
      nextErrors.finishedKg = 'Enter a finished muri quantity greater than 0.';
    }

    if (wastageKg.trim() !== '') {
      const wastageValue = Number(wastageKg);

      if (!Number.isFinite(wastageValue) || wastageValue < 0) {
        nextErrors.wastageKg = 'Wastage must be 0 or more.';
      }
    }

    if (productionCost.trim() !== '') {
      const costValue = Number(productionCost);

      if (!Number.isFinite(costValue) || costValue < 0) {
        nextErrors.productionCost = 'Production cost must be 0 or more.';
      }
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
      const data = await createProductionApi({
        productionDate,
        rawMaterialKg: rawValue,
        finishedKg: finishedValue,
        wastageKg: wastageKg.trim() === '' ? 0 : Number(wastageKg),
        productionCost: productionCost.trim() === '' ? 0 : Number(productionCost),
        notes: notes.trim(),
      });

      toast.success(
        `Production ${data.production.productionNumber} recorded. ${data.production.productName} stock is now ${formatQuantity(
          data.stock.quantity,
        )} ${data.stock.unit}.`,
      );
      onSaved(data.production);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to record the production.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="production-dialog-title"
        className="my-6 w-full max-w-xl rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="production-dialog-title" className="text-lg font-semibold text-ink-900">
              Record production
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Finished Muri is added to stock once. Raw material is kept on the production record
              only.
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">
                Production number
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-900">Generated automatically</p>
              <p className="mt-0.5 text-xs text-ink-500">
                A sequential PROD-000001-style number is assigned when the record is saved.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Production date"
                htmlFor="production-date"
                error={errors.productionDate}
                required
              >
                <input
                  id="production-date"
                  type="date"
                  max={toDateInputValue()}
                  className={fieldInputClass(Boolean(errors.productionDate))}
                  value={productionDate}
                  onChange={(event) => {
                    setProductionDate(event.target.value);
                    setErrors((previous) => ({ ...previous, productionDate: '' }));
                  }}
                />
              </FormField>

              <FormField
                label="Production cost"
                htmlFor="production-cost"
                error={errors.productionCost}
                hint="Optional"
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                    ₹
                  </span>
                  <input
                    id="production-cost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className={`${fieldInputClass(Boolean(errors.productionCost))} pl-8`}
                    placeholder="0.00"
                    value={productionCost}
                    onChange={(event) => {
                      setProductionCost(event.target.value);
                      setErrors((previous) => ({ ...previous, productionCost: '' }));
                    }}
                  />
                </div>
              </FormField>

              <FormField
                label="Raw material quantity"
                htmlFor="production-raw"
                error={errors.rawMaterialKg}
                hint="KG processed in this batch"
                required
              >
                <div className="relative">
                  <input
                    id="production-raw"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.001"
                    autoFocus
                    className={`${fieldInputClass(Boolean(errors.rawMaterialKg))} pr-12`}
                    placeholder="0.000"
                    value={rawMaterialKg}
                    onChange={(event) => {
                      setRawMaterialKg(event.target.value);
                      setErrors((previous) => ({ ...previous, rawMaterialKg: '' }));
                    }}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">
                    KG
                  </span>
                </div>
              </FormField>

              <FormField
                label="Finished muri quantity"
                htmlFor="production-finished"
                error={errors.finishedKg}
                hint="KG added to Muri stock"
                required
              >
                <div className="relative">
                  <input
                    id="production-finished"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.001"
                    className={`${fieldInputClass(Boolean(errors.finishedKg))} pr-12`}
                    placeholder="0.000"
                    value={finishedKg}
                    onChange={(event) => {
                      setFinishedKg(event.target.value);
                      setErrors((previous) => ({ ...previous, finishedKg: '' }));
                    }}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">
                    KG
                  </span>
                </div>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Wastage / loss"
                htmlFor="production-wastage"
                error={errors.wastageKg}
                hint="Optional"
              >
                <div className="relative">
                  <input
                    id="production-wastage"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.001"
                    className={`${fieldInputClass(Boolean(errors.wastageKg))} pr-12`}
                    placeholder="0.000"
                    value={wastageKg}
                    onChange={(event) => {
                      setWastageKg(event.target.value);
                      setErrors((previous) => ({ ...previous, wastageKg: '' }));
                    }}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-400">
                    KG
                  </span>
                </div>
              </FormField>
            </div>

            <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-ink-500">Yield</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-700">
                    {yieldPercent === null ? '—' : `${formatQuantity(yieldPercent)}%`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">Finished ÷ raw × 100</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-500">Raw material per KG muri</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-700">
                    {rawPerKg === null ? '—' : `${formatQuantity(rawPerKg)} KG`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">Raw ÷ finished</p>
                </div>
              </div>
              <p className="mt-3 border-t border-brand-200/70 pt-3 text-xs text-ink-600">
                {hasFinished
                  ? `${formatQuantity(finishedValue)} KG of finished Muri will be added to stock when this record is saved.`
                  : 'Enter the raw material and finished quantities to see the ratio.'}
              </p>
            </div>

            <FormField
              label="Notes"
              htmlFor="production-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="production-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Batch details, machine or shift notes"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrors((previous) => ({ ...previous, notes: '' }));
                }}
              />
            </FormField>

            {productionCost.trim() !== '' && Number(productionCost) >= 0 ? (
              <p className="text-xs text-ink-400">
                Recorded production cost: {formatINR2(Number(productionCost))}. This is kept on
                the production record and does not post to expenses.
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
                'Save production'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionFormDialog;
