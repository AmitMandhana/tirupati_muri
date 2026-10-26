import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import FormField from './FormField';
import NavIcon from './NavIcon';
import Spinner from './Spinner';
import { createProductApi, updateProductApi } from '../services/productService';
import { getApiErrorMessage } from '../utils/errors';
import { fieldInputClass } from '../utils/formStyles';

const toNumber = (value) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

const ProductFormDialog = ({ product, onClose, onSaved }) => {
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState(() => ({
    name: product?.name ?? '',
    unit: product?.unit ?? 'KG',
    retailRate: product?.retailRate ?? '',
    wholesaleRate: product?.wholesaleRate ?? '',
    bagWeight: product?.bagWeight ?? '',
  }));
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

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    const name = formData.name.trim();
    const unit = formData.unit.trim();

    if (!name) {
      nextErrors.name = 'Product name is required.';
    } else if (name.length > 100) {
      nextErrors.name = 'Product name cannot be longer than 100 characters.';
    }

    if (!unit) {
      nextErrors.unit = 'Unit is required.';
    } else if (unit.length > 20) {
      nextErrors.unit = 'Unit cannot be longer than 20 characters.';
    }

    const retailRate = toNumber(formData.retailRate);
    if (retailRate === null || retailRate < 0) {
      nextErrors.retailRate = 'Enter a rate of ₹0 or more.';
    }

    const wholesaleRate = toNumber(formData.wholesaleRate);
    if (wholesaleRate === null || wholesaleRate < 0) {
      nextErrors.wholesaleRate = 'Enter a rate of ₹0 or more.';
    }

    const bagWeight = toNumber(formData.bagWeight);
    if (bagWeight === null || bagWeight <= 0) {
      nextErrors.bagWeight = 'Bag weight must be greater than 0.';
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
      name: formData.name.trim(),
      unit: formData.unit.trim(),
      retailRate: toNumber(formData.retailRate),
      wholesaleRate: toNumber(formData.wholesaleRate),
      bagWeight: toNumber(formData.bagWeight),
    };

    setIsSaving(true);
    try {
      const data = isEditing
        ? await updateProductApi(product._id, payload)
        : await createProductApi(payload);

      toast.success(isEditing ? 'Product updated.' : 'Product created.');
      onSaved(data.product);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save the product.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        className="my-6 w-full max-w-lg rounded-xl border border-cream-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-6 py-4">
          <div>
            <h2 id="product-dialog-title" className="text-lg font-semibold text-ink-900">
              {isEditing ? 'Edit product' : 'Add product'}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {isEditing
                ? 'Update the rates or packaging for this product.'
                : 'Create a product that can be sold in future billing modules.'}
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
            <FormField label="Product name" htmlFor="product-name" error={errors.name} required>
              <input
                id="product-name"
                type="text"
                maxLength={100}
                autoFocus
                className={fieldInputClass(Boolean(errors.name))}
                placeholder="Muri"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Unit"
                htmlFor="product-unit"
                error={errors.unit}
                hint="For example KG."
                required
              >
                <input
                  id="product-unit"
                  type="text"
                  maxLength={20}
                  className={fieldInputClass(Boolean(errors.unit))}
                  placeholder="KG"
                  value={formData.unit}
                  onChange={(event) => updateField('unit', event.target.value)}
                />
              </FormField>

              <FormField
                label="Bag weight (KG)"
                htmlFor="product-bag-weight"
                error={errors.bagWeight}
                required
              >
                <input
                  id="product-bag-weight"
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  step="0.1"
                  className={fieldInputClass(Boolean(errors.bagWeight))}
                  placeholder="50"
                  value={formData.bagWeight}
                  onChange={(event) => updateField('bagWeight', event.target.value)}
                />
              </FormField>

              <FormField
                label="Retail rate (₹/unit)"
                htmlFor="product-retail-rate"
                error={errors.retailRate}
                required
              >
                <input
                  id="product-retail-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className={fieldInputClass(Boolean(errors.retailRate))}
                  placeholder="45"
                  value={formData.retailRate}
                  onChange={(event) => updateField('retailRate', event.target.value)}
                />
              </FormField>

              <FormField
                label="Wholesale rate (₹/unit)"
                htmlFor="product-wholesale-rate"
                error={errors.wholesaleRate}
                required
              >
                <input
                  id="product-wholesale-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className={fieldInputClass(Boolean(errors.wholesaleRate))}
                  placeholder="42"
                  value={formData.wholesaleRate}
                  onChange={(event) => updateField('wholesaleRate', event.target.value)}
                />
              </FormField>
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
              ) : isEditing ? (
                'Save changes'
              ) : (
                'Create product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormDialog;
