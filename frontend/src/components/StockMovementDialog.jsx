import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { createStockMovementApi, recordOpeningStockApi } from '../services/stockService';
import { getApiErrorMessage } from '../utils/errors';
import { fieldInputClass } from '../utils/formStyles';
import { formatQuantity } from '../utils/format';

const ACTION_CONFIG = {
  opening: {
    title: 'Record opening stock',
    description: 'Enter the quantity currently on hand. Opening stock can only be recorded once.',
    submitLabel: 'Record opening stock',
  },
  purchase: {
    title: 'Add stock',
    description: 'Record a purchase or any other stock addition.',
    submitLabel: 'Add stock',
  },
  wastage: {
    title: 'Record wastage',
    description: 'Remove damaged, spilled or otherwise lost stock.',
    submitLabel: 'Record wastage',
  },
  adjustment: {
    title: 'Adjust stock',
    description: 'Correct the stock balance. Use a negative quantity to reduce stock.',
    submitLabel: 'Save adjustment',
  },
};

const toNumber = (value) => {
  const text = String(value ?? '').trim();

  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const StockMovementDialog = ({ action, product, onClose, onSaved }) => {
  const config = ACTION_CONFIG[action];

  const [quantity, setQuantity] = useState('');
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

  const unit = product.unit;
  const quantityValue = toNumber(quantity);
  const signedQuantity =
    action === 'wastage' ? -Math.abs(quantityValue ?? 0) : (quantityValue ?? 0);
  const resultingQuantity =
    quantityValue === null ? product.quantity : product.quantity + signedQuantity;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (quantityValue === null) {
      nextErrors.quantity = 'Enter a quantity.';
    } else if (action === 'adjustment') {
      if (quantityValue === 0) {
        nextErrors.quantity = 'Adjustment quantity cannot be zero.';
      }
    } else if (quantityValue <= 0) {
      nextErrors.quantity = 'Enter a quantity greater than 0.';
    }

    const reducesStock = action === 'wastage' || (action === 'adjustment' && quantityValue < 0);

    if (!nextErrors.quantity && reducesStock && Math.abs(quantityValue) > product.quantity) {
      nextErrors.quantity = `Only ${formatQuantity(product.quantity)} ${unit} is available.`;
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
      const payload = {
        productId: product.productId,
        quantity: quantityValue,
        notes: notes.trim(),
      };

      if (action === 'opening') {
        await recordOpeningStockApi(payload);
        toast.success('Opening stock recorded.');
      } else {
        await createStockMovementApi({ ...payload, type: action });
        toast.success('Stock updated.');
      }

      onSaved();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update stock.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-dialog-title"
        className="my-6 w-full max-w-md rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="stock-dialog-title" className="text-lg font-semibold text-ink-900">
              {config.title}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">{config.description}</p>
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                {product.productName} available
              </p>
              <p className="mt-1 text-lg font-semibold text-ink-900">
                {formatQuantity(product.quantity)} {unit}
              </p>
            </div>

            <FormField
              label={`Quantity (${unit})`}
              htmlFor="stock-quantity"
              error={errors.quantity}
              hint={
                action === 'adjustment'
                  ? 'Positive to add stock, negative to remove stock.'
                  : action === 'wastage'
                    ? 'The quantity removed from stock.'
                    : 'The quantity added to stock.'
              }
              required
            >
              <input
                id="stock-quantity"
                type="number"
                inputMode="decimal"
                step="0.01"
                autoFocus
                className={fieldInputClass(Boolean(errors.quantity))}
                placeholder={action === 'adjustment' ? '-5' : '50'}
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setErrors((prev) => ({ ...prev, quantity: '' }));
                }}
              />
            </FormField>

            <div className="flex items-baseline justify-between rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-2.5 text-sm">
              <span className="text-brand-700">New balance</span>
              <span className="font-semibold text-ink-900">
                {resultingQuantity < 0
                  ? '—'
                  : `${formatQuantity(resultingQuantity)} ${unit}`}
              </span>
            </div>

            <FormField
              label="Notes"
              htmlFor="stock-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="stock-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Reason or supplier details"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrors((prev) => ({ ...prev, notes: '' }));
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
                config.submitLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockMovementDialog;
