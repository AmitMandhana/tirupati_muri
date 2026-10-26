import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import FormField from '../components/FormField';
import NavIcon from '../components/NavIcon';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { getApiErrorMessage } from '../utils/errors';
import { fieldInputClass } from '../utils/formStyles';
import { isValidEmail, isValidGstNumber, isValidPhone } from '../utils/validation';

const SETTINGS_FIELDS = [
  'businessName',
  'address',
  'phone',
  'email',
  'gstNumber',
  'ownerName',
  'receiptFooter',
  'invoiceFooter',
  'retailMuriRate',
  'wholesaleMuriRate',
  'bagWeightKg',
];

const NUMERIC_FIELDS = new Set(['retailMuriRate', 'wholesaleMuriRate', 'bagWeightKg']);

const normalizedValues = (values) =>
  SETTINGS_FIELDS.map((field) => {
    const value = values[field];

    if (NUMERIC_FIELDS.has(field)) {
      return value === '' || value === null || value === undefined ? '' : Number(value);
    }

    return typeof value === 'string' ? value.trim() : (value ?? '');
  });

const toNumber = (value) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const BusinessSettingsForm = ({ initialValues }) => {
  const { saveSettings } = useBusinessSettings();

  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const isDirty =
    JSON.stringify(normalizedValues(formData)) !== JSON.stringify(normalizedValues(initialValues));

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.businessName.trim()) {
      nextErrors.businessName = 'Business name is required.';
    } else if (formData.businessName.trim().length > 150) {
      nextErrors.businessName = 'Business name cannot be longer than 150 characters.';
    }

    if (formData.ownerName.trim().length > 100) {
      nextErrors.ownerName = 'Owner name cannot be longer than 100 characters.';
    }

    if (formData.address.trim().length > 500) {
      nextErrors.address = 'Address cannot be longer than 500 characters.';
    }

    if (formData.email.trim() && !isValidEmail(formData.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (formData.phone.trim() && !isValidPhone(formData.phone)) {
      nextErrors.phone = 'Enter a valid phone number.';
    }

    if (formData.gstNumber.trim() && !isValidGstNumber(formData.gstNumber)) {
      nextErrors.gstNumber = 'Enter a valid 15 character GST number.';
    }

    if (formData.receiptFooter.trim().length > 500) {
      nextErrors.receiptFooter = 'Receipt footer cannot be longer than 500 characters.';
    }

    if (formData.invoiceFooter.trim().length > 500) {
      nextErrors.invoiceFooter = 'Invoice footer cannot be longer than 500 characters.';
    }

    const retailMuriRate = toNumber(formData.retailMuriRate);
    if (retailMuriRate === null || retailMuriRate < 0) {
      nextErrors.retailMuriRate = 'Enter a rate of ₹0 or more.';
    }

    const wholesaleMuriRate = toNumber(formData.wholesaleMuriRate);
    if (wholesaleMuriRate === null || wholesaleMuriRate < 0) {
      nextErrors.wholesaleMuriRate = 'Enter a rate of ₹0 or more.';
    }

    const bagWeightKg = toNumber(formData.bagWeightKg);
    if (bagWeightKg === null || bagWeightKg <= 0) {
      nextErrors.bagWeightKg = 'Bag weight must be greater than 0.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    const payload = {
      businessName: formData.businessName.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      gstNumber: formData.gstNumber.trim().toUpperCase(),
      ownerName: formData.ownerName.trim(),
      receiptFooter: formData.receiptFooter.trim(),
      invoiceFooter: formData.invoiceFooter.trim(),
      retailMuriRate: toNumber(formData.retailMuriRate),
      wholesaleMuriRate: toNumber(formData.wholesaleMuriRate),
      bagWeightKg: toNumber(formData.bagWeightKg),
    };

    setIsSaving(true);
    try {
      await saveSettings(payload);
      setErrors({});
      toast.success('Business settings saved.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save business settings.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setFormData(initialValues);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-7 p-6">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Business details
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <FormField
              label="Business name"
              htmlFor="business-name"
              error={errors.businessName}
              required
            >
              <input
                id="business-name"
                type="text"
                autoComplete="organization"
                className={fieldInputClass(Boolean(errors.businessName))}
                placeholder="Tirupati Puffed Rice Mill"
                value={formData.businessName}
                onChange={(event) => updateField('businessName', event.target.value)}
              />
            </FormField>

            <FormField label="Owner name" htmlFor="owner-name" error={errors.ownerName}>
              <input
                id="owner-name"
                type="text"
                autoComplete="name"
                className={fieldInputClass(Boolean(errors.ownerName))}
                placeholder="Owner's full name"
                value={formData.ownerName}
                onChange={(event) => updateField('ownerName', event.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Contact details
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" htmlFor="business-phone" error={errors.phone}>
              <input
                id="business-phone"
                type="tel"
                autoComplete="tel"
                maxLength={20}
                className={fieldInputClass(Boolean(errors.phone))}
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(event) => updateField('phone', event.target.value)}
              />
            </FormField>

            <FormField label="Email" htmlFor="business-email" error={errors.email}>
              <input
                id="business-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                className={fieldInputClass(Boolean(errors.email))}
                placeholder="info@example.com"
                value={formData.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </FormField>

            <FormField
              label="Address"
              htmlFor="business-address"
              error={errors.address}
              hint="Shop or mill address, including town and pin code."
              className="sm:col-span-2"
            >
              <textarea
                id="business-address"
                rows={3}
                autoComplete="street-address"
                maxLength={500}
                className={`${fieldInputClass(Boolean(errors.address))} resize-y`}
                placeholder="Main Road, Rajahmundry, Andhra Pradesh"
                value={formData.address}
                onChange={(event) => updateField('address', event.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Tax details
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <FormField
              label="GST number"
              htmlFor="business-gst"
              error={errors.gstNumber}
              hint="Optional. 15-character GSTIN, for example 37ABCDE1234F1Z5."
            >
              <input
                id="business-gst"
                type="text"
                maxLength={15}
                spellCheck={false}
                className={`${fieldInputClass(Boolean(errors.gstNumber))} uppercase`}
                placeholder="37ABCDE1234F1Z5"
                value={formData.gstNumber}
                onChange={(event) => updateField('gstNumber', event.target.value.toUpperCase())}
              />
            </FormField>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Rates and packaging
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            Business-level defaults for Muri. Product rates are managed in Product Management.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <FormField
              label="Retail muri rate (₹/KG)"
              htmlFor="retail-muri-rate"
              error={errors.retailMuriRate}
            >
              <input
                id="retail-muri-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className={fieldInputClass(Boolean(errors.retailMuriRate))}
                placeholder="45"
                value={formData.retailMuriRate}
                onChange={(event) => updateField('retailMuriRate', event.target.value)}
              />
            </FormField>

            <FormField
              label="Wholesale muri rate (₹/KG)"
              htmlFor="wholesale-muri-rate"
              error={errors.wholesaleMuriRate}
            >
              <input
                id="wholesale-muri-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className={fieldInputClass(Boolean(errors.wholesaleMuriRate))}
                placeholder="42"
                value={formData.wholesaleMuriRate}
                onChange={(event) => updateField('wholesaleMuriRate', event.target.value)}
              />
            </FormField>

            <FormField
              label="Bag weight (KG)"
              htmlFor="bag-weight"
              error={errors.bagWeightKg}
            >
              <input
                id="bag-weight"
                type="number"
                inputMode="decimal"
                min="0.1"
                step="0.1"
                className={fieldInputClass(Boolean(errors.bagWeightKg))}
                placeholder="50"
                value={formData.bagWeightKg}
                onChange={(event) => updateField('bagWeightKg', event.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Document footers
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            Printed at the bottom of future receipts and invoices.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <FormField
              label="Receipt footer"
              htmlFor="receipt-footer"
              error={errors.receiptFooter}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="receipt-footer"
                rows={3}
                maxLength={500}
                className={`${fieldInputClass(Boolean(errors.receiptFooter))} resize-y`}
                placeholder="Thank you for your business."
                value={formData.receiptFooter}
                onChange={(event) => updateField('receiptFooter', event.target.value)}
              />
            </FormField>

            <FormField
              label="Invoice footer"
              htmlFor="invoice-footer"
              error={errors.invoiceFooter}
              hint="Optional. Up to 500 characters."
            >
              <textarea
                id="invoice-footer"
                rows={3}
                maxLength={500}
                className={`${fieldInputClass(Boolean(errors.invoiceFooter))} resize-y`}
                placeholder="Goods once sold will not be taken back."
                value={formData.invoiceFooter}
                onChange={(event) => updateField('invoiceFooter', event.target.value)}
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-cream-200 bg-cream-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-400">
          {isDirty ? 'You have unsaved changes.' : 'All changes are saved.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleDiscard}
            disabled={!isDirty || isSaving}
          >
            Discard
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving || !isDirty}>
            {isSaving ? (
              <>
                <Spinner /> Saving...
              </>
            ) : (
              'Save settings'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

const SettingsPage = () => {
  const { user } = useAuth();
  const { settings, isLoading, loadError, loadSettings } = useBusinessSettings();

  const formKey = JSON.stringify(normalizedValues(settings));

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const pageHeader = (
    <PageHeader
      title="Business settings"
      description="Manage the mill's profile, rates and document footers. These values are saved to MongoDB and used throughout the application."
    />
  );

  if (isLoading) {
    return (
      <div>
        {pageHeader}
        <section className="card flex items-center justify-center gap-3 px-6 py-16 text-sm text-ink-500">
          <Spinner className="h-4 w-4 text-brand-600" />
          Loading business settings...
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        {pageHeader}
        <section className="card border-red-200 p-6">
          <h2 className="text-base font-semibold text-ink-900">Settings could not be loaded</h2>
          <p className="mt-1 text-sm text-ink-500">{loadError}</p>
          <button type="button" className="btn-secondary mt-4" onClick={loadSettings}>
            Try again
          </button>
        </section>
      </div>
    );
  }

  return (
    <div>
      {pageHeader}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card">
          <div className="flex items-center gap-3 border-b border-cream-200 px-6 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <NavIcon name="settings" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink-900">Business profile</h2>
              <p className="text-xs text-ink-500">Shown in the sidebar, header and dashboard.</p>
            </div>
          </div>

          <BusinessSettingsForm key={formKey} initialValues={settings} />
        </section>

        <aside className="space-y-4">
          <section className="card p-6">
            <h2 className="text-base font-semibold text-ink-900">Signed-in account</h2>
            <p className="mt-1 text-xs text-ink-500">
              This application uses a single owner account.
            </p>
            <table className="mt-4 w-full text-left text-sm">
              <tbody className="divide-y divide-cream-200">
                <tr>
                  <th scope="row" className="py-2.5 pr-3 font-medium text-ink-500">
                    Name
                  </th>
                  <td className="py-2.5 text-right font-medium text-ink-900">
                    {user?.name ?? '—'}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-2.5 pr-3 font-medium text-ink-500">
                    Email
                  </th>
                  <td className="break-all py-2.5 text-right text-ink-900">{user?.email ?? '—'}</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2.5 pr-3 font-medium text-ink-500">
                    Member since
                  </th>
                  <td className="py-2.5 text-right text-ink-900">{memberSince}</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2.5 pr-3 font-medium text-ink-500">
                    Account type
                  </th>
                  <td className="py-2.5 text-right text-ink-900">Single user</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="card p-6">
            <h2 className="text-base font-semibold text-ink-900">Product catalogue</h2>
            <p className="mt-1 text-sm text-ink-500">
              Manage Muri and other products, including their retail and wholesale rates.
            </p>
            <Link to="/products" className="btn-secondary mt-4 w-full">
              Open Product Management
            </Link>
          </section>

          <section className="card border-brand-100 bg-brand-50/60 p-6">
            <h2 className="text-base font-semibold text-ink-900">About these settings</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Business name updates in the sidebar, header and dashboard after saving. Muri rates,
              bag weight and document footers are stored for use in future billing modules.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default SettingsPage;
