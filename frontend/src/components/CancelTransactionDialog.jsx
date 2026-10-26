import { useEffect, useState } from 'react';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { fieldInputClass } from '../utils/formStyles';

const CancelTransactionDialog = ({
  title = 'Cancel transaction',
  description,
  confirmText = 'Cancel transaction',
  isSaving = false,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) {
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
  }, [isSaving, onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (reason.trim().length > 300) {
      setError('Reason cannot be longer than 300 characters.');
      return;
    }

    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        className="w-full max-w-md rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="cancel-dialog-title" className="text-lg font-semibold text-ink-900">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              {description ??
                'The transaction will be marked CANCELLED, kept in the audit trail and removed from all balances, ledgers and reports.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSaving}
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-700"
          >
            <NavIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            <FormField
              label="Cancellation reason"
              htmlFor="cancel-reason"
              error={error}
              hint="Optional. Up to 300 characters; it is stored with the cancelled record."
            >
              <textarea
                id="cancel-reason"
                rows={3}
                maxLength={300}
                autoFocus
                className={fieldInputClass(Boolean(error))}
                placeholder="e.g. Bill entered twice, customer returned the goods"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-cream-200 bg-cream-50/70 px-6 py-4">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Keep transaction
            </button>
            <button type="submit" className="btn-danger" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner /> Cancelling...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelTransactionDialog;
