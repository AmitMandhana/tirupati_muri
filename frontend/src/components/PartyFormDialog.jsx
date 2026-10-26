import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { createPartyApi } from '../services/partyService';
import { getApiErrorMessage } from '../utils/errors';
import { fieldInputClass } from '../utils/formStyles';

const PartyFormDialog = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
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

    if (!name.trim()) {
      nextErrors.name = 'Enter the party name.';
    } else if (name.trim().length > 150) {
      nextErrors.name = 'Party name cannot be longer than 150 characters.';
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Enter the party phone number.';
    } else if (phone.trim().length > 20) {
      nextErrors.phone = 'Phone cannot be longer than 20 characters.';
    }

    if (address.trim().length > 300) {
      nextErrors.address = 'Address cannot be longer than 300 characters.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const data = await createPartyApi({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      toast.success('Party created.');
      onSaved(data.party);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to create the party.'));
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
        className="my-6 w-full max-w-md rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="party-dialog-title" className="text-lg font-semibold text-ink-900">
              Add party
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Parties are used on wholesale invoices.
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
                placeholder="Sri Lakshmi Traders"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
              />
            </FormField>

            <FormField
              label="Phone"
              htmlFor="party-phone"
              error={errors.phone}
              hint="Printed on the invoice. 7 to 15 digits."
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
                  setErrors((prev) => ({ ...prev, phone: '' }));
                }}
              />
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
                  setErrors((prev) => ({ ...prev, address: '' }));
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
