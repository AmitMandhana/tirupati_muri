import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { createStaffApi, updateStaffApi } from '../services/staffService';
import { getApiErrorMessage } from '../utils/errors';
import { toDateInputValue } from '../utils/format';
import { fieldInputClass } from '../utils/formStyles';
import { isValidPhone } from '../utils/validation';

const toAmountText = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount !== 0 ? String(amount) : '';
};

const StaffFormDialog = ({ staff = null, onClose, onSaved }) => {
  const isEditing = Boolean(staff);
  const [name, setName] = useState(staff?.name ?? '');
  const [phone, setPhone] = useState(staff?.phone ?? '');
  const [role, setRole] = useState(staff?.role ?? '');
  const [joiningDate, setJoiningDate] = useState(
    staff?.joiningDate ? toDateInputValue(staff.joiningDate) : toDateInputValue(),
  );
  const [monthlySalary, setMonthlySalary] = useState(toAmountText(staff?.monthlySalary));
  const [status, setStatus] = useState(staff?.status ?? 'active');
  const [notes, setNotes] = useState(staff?.notes ?? '');
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
    const salaryValue = monthlySalary.trim() ? Number(monthlySalary) : 0;

    if (!name.trim()) {
      nextErrors.name = 'Enter the staff name.';
    } else if (name.trim().length > 150) {
      nextErrors.name = 'Staff name cannot be longer than 150 characters.';
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Enter the staff phone number.';
    } else if (phone.trim().length > 20 || !isValidPhone(phone)) {
      nextErrors.phone = 'Enter a valid phone number with 7 to 15 digits.';
    }

    if (!role.trim()) {
      nextErrors.role = 'Enter the staff role.';
    } else if (role.trim().length > 100) {
      nextErrors.role = 'Role cannot be longer than 100 characters.';
    }

    if (!joiningDate) {
      nextErrors.joiningDate = 'Select the joining date.';
    }

    if (!Number.isFinite(salaryValue) || salaryValue <= 0) {
      nextErrors.monthlySalary = 'Enter a monthly salary greater than 0.';
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
        role: role.trim(),
        joiningDate,
        monthlySalary: salaryValue,
        status,
        notes: notes.trim(),
      };
      const data = isEditing
        ? await updateStaffApi(staff._id, payload)
        : await createStaffApi(payload);

      toast.success(isEditing ? 'Staff member updated.' : 'Staff member added.');
      onSaved(data.staff);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          isEditing ? 'Unable to update the staff member.' : 'Unable to add the staff member.',
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
        aria-labelledby="staff-dialog-title"
        className="my-6 w-full max-w-lg rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="staff-dialog-title" className="text-lg font-semibold text-ink-900">
              {isEditing ? 'Edit staff member' : 'Add staff member'}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {isEditing
                ? 'Update contact details, salary and status.'
                : 'Staff members get a ledger for salary, advances, bonuses and payments.'}
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
              <FormField label="Name" htmlFor="staff-name" error={errors.name} required>
                <input
                  id="staff-name"
                  type="text"
                  autoFocus
                  maxLength={150}
                  className={fieldInputClass(Boolean(errors.name))}
                  placeholder="Ramesh Kumar"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setErrors((previous) => ({ ...previous, name: '' }));
                  }}
                />
              </FormField>

              <FormField
                label="Phone"
                htmlFor="staff-phone"
                error={errors.phone}
                hint="7 to 15 digits."
                required
              >
                <input
                  id="staff-phone"
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

              <FormField label="Role" htmlFor="staff-role" error={errors.role} required>
                <input
                  id="staff-role"
                  type="text"
                  maxLength={100}
                  className={fieldInputClass(Boolean(errors.role))}
                  placeholder="Machine operator"
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value);
                    setErrors((previous) => ({ ...previous, role: '' }));
                  }}
                />
              </FormField>

              <FormField
                label="Joining date"
                htmlFor="staff-joining-date"
                error={errors.joiningDate}
                required
              >
                <input
                  id="staff-joining-date"
                  type="date"
                  max={toDateInputValue()}
                  className={fieldInputClass(Boolean(errors.joiningDate))}
                  value={joiningDate}
                  onChange={(event) => {
                    setJoiningDate(event.target.value);
                    setErrors((previous) => ({ ...previous, joiningDate: '' }));
                  }}
                />
              </FormField>

              <FormField
                label="Monthly salary"
                htmlFor="staff-monthly-salary"
                error={errors.monthlySalary}
                required
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
                    ₹
                  </span>
                  <input
                    id="staff-monthly-salary"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    className={`${fieldInputClass(Boolean(errors.monthlySalary))} pl-8`}
                    placeholder="15000"
                    value={monthlySalary}
                    onChange={(event) => {
                      setMonthlySalary(event.target.value);
                      setErrors((previous) => ({ ...previous, monthlySalary: '' }));
                    }}
                  />
                </div>
              </FormField>

              <FormField label="Status" htmlFor="staff-status">
                <select
                  id="staff-status"
                  className="field-input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </div>

            <FormField
              label="Notes"
              htmlFor="staff-notes"
              error={errors.notes}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="staff-notes"
                rows={2}
                maxLength={500}
                className={fieldInputClass(Boolean(errors.notes))}
                placeholder="Shift timings, responsibilities..."
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
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Add staff member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffFormDialog;
