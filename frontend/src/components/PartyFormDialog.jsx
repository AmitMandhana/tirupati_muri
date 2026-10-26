import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { createPartyApi, updatePartyApi } from '../services/partyService';
import { getApiErrorMessage } from '../utils/errors';
import { fieldInputClass } from '../utils/formStyles';
import { isValidPhone } from '../utils/validation';

const toAmountText = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount !== 0 ? String(amount) : '';
};

const PartyFormDialog = ({ party = null, onClose, onSaved }) => {
  const isEditing = Boolean(party);
  const [name, setName] = useState(party?.name ?? '');
  const [phone, setPhone] = useState(party?.phone ?? '');
  const [address, setAddress] = useState(party?.address ?? '');
  const [openingBalance, setOpeningBalance] = useState(toAmountText(party?.openingBalance));
  const [creditLimit, setCreditLimit] = useState(toAmountText(party?.creditLimit));
  const [notes, setNotes] = useState(party?.notes ?? '');
  const [active, setActive] = useState(party?.active !== false);
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
    const openingValue = openingBalance.trim() ? Number(openingBalance) : 0;
    const creditValue = creditLimit.trim() ? Number(creditLimit) : 0;

    if (!name.trim()) {
      nextErrors.name = 'Enter the party name.';
    } else if (name.trim().length > 150) {
      nextErrors.name = 'Party name cannot be longer than 150 characters.';
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Enter the party phone number.';
    } else if (phone.trim().length > 20 || !isValidPhone(phone)) {
      nextErrors.phone = 'Enter a valid party phone number with 7 to 15 digits.';
    }

    if (address.trim().length > 300) {
      nextErrors.address = 'Address cannot be longer than 300 characters.';
    }

    if (!Number.isFinite(openingValue) || openingValue < 0) {
      nextErrors.openingBalance = 'Opening balance must be 0 or more.';
    }

    if (!Number.isFinite(creditValue) || creditValue < 0) {
      nextErrors.creditLimit = 'Credit limit must be 0 or more.';
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
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        openingBalance: openingValue,
        creditLimit: creditValue,
        notes: notes.trim(),
        active,
      };
      const data = isEditing
        ? await updatePartyApi(party._id, payload)
        : await createPartyApi(payload);

      toast.success(isEditing ? 'Party updated.' : 'Party created.');
      onSaved(data.party);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          isEditing ? 'Unable to update the party.' : 'Unable to create the party.',
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
        aria-labelledby="party-dialog-title"
        className="my-6 w-full max-w-lg rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="party-dialog-title" className="text-lg font-semibold text-ink-900">
              {isEditing ? 'Edit party' : 'Add party'}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {isEditing
                ? 'Update account details and credit terms.'
                : 'Parties are used on wholesale invoices and in the payment ledger.'}
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
            <FormField label="Party name" htmlFor="party-name" error={errors.name} required>
              <input
                id="party-name"
                type="text"
                autoFocus
                maxLength={150}
                className={fieldInputClass(Boolean(errors.name))}
                placeholder="ABC Traders"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((previous) => ({ ...previous, name: '' }));
                }}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Phone"
                htmlFor="party-phone"
                error={errors.phone}
                hint="7 to 15 digits."
                required
              >
                <input
                  id="party-phone"
                  type="tel"
                  maxLength={20}
                  className={fieldInputClass(Boolean(errors.phone))}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setErrors((previous) => ({ ...previous, phone: '' }));
                  }}
                />
              </FormField>

              <FormField
                label="Credit limit"
                htmlFor="party-credit-limit"
                error={errors.creditLimit}
                hint="0 means no limit."
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                    ₹
                  </span>
                  <input
                    id="party-credit-limit"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className={`${fieldInputClass(Boolean(errors.creditLimit))} pl-8`}
                    placeholder="0"
                    value={creditLimit}
                    onChange={(event) => {
                      setCreditLimit(event.target.value);
                      setErrors((previous) => ({ ...previous, creditLimit: '' }));
                    }}
                  />
                </div>
              </FormField>
            </div>

            <FormField
              label="Opening balance"
              htmlFor="party-opening-balance"
              error={errors.openingBalance}
              hint="Amount the party already owes before the first invoice."
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                  ₹
                </span>
                <input
                  id="party-opening-balance"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className={`${fieldInputClass(Boolean(errors.openingBalance))} pl-8`}
                  placeholder="0"
                  value={openingBalance}
                  onChange={(event) => {
                    setOpeningBalance(event.target.value);
                    setErrors((previous) => ({ ...previous, openingBalance: '' }));
                  }}
                />
              </div>
            </FormField>

            <FormField
              label="Address"
              htmlFor="party-address"
              error={errors.address}
              hint="Optional. Up to 300 characters."
            >
              <textarea
                id="party-address"
                rows={2}
                maxLength={300}
                className={fieldInputClass(Boolean(errors.address))}
                placeholder="Delivery address"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  setErrors((previous) => ({ ...previous, address: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Notes"
              htmlFor="party-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="party-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Credit terms, delivery preferences..."
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setErrors((previous) => ({ ...previous, notes: '' }));
                }}
              />
            </FormField>

            <label
              htmlFor="party-active"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-cream-200 bg-cream-50/60 px-4 py-3"
            >
              <input
                id="party-active"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-cream-300 accent-brand-600"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-ink-900">Active party</span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  Inactive parties keep their ledger but cannot receive new invoices.
                </span>
              </span>
            </label>
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
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Add party'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartyFormDialog;
