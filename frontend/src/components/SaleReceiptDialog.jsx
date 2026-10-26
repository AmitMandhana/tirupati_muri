import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

import NavIcon from './NavIcon';
import ThermalReceipt from './ThermalReceipt';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { downloadReceiptPdf } from '../utils/receiptPdf';
import { getPaymentLabel } from '../utils/billing';
import { formatINR2 } from '../utils/format';

const RECEIPT_WIDTHS = [
  { value: 58, label: '58 mm' },
  { value: 80, label: '80 mm' },
];

const SaleReceiptDialog = ({ sale, mode = 'completed', onClose, onNewSale }) => {
  const { settings } = useBusinessSettings();
  const [widthMm, setWidthMm] = useState(58);

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

  if (!sale) {
    return null;
  }

  const handleDownload = async () => {
    try {
      await downloadReceiptPdf(sale, settings, widthMm);
      toast.success('Receipt PDF downloaded.');
    } catch {
      toast.error('Unable to generate the receipt PDF.');
    }
  };

  return createPortal(
    <div
      className="receipt-portal fixed inset-0 z-50 overflow-y-auto bg-ink-900/60 p-4 sm:p-6"
      style={{ '--receipt-width': `${widthMm}mm` }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-dialog-title"
    >
      <style>{`@media print { @page { size: ${widthMm}mm auto; margin: 0; } }`}</style>

      <div className="receipt-shell mx-auto my-2 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl sm:my-6">
        <div className="receipt-chrome flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                mode === 'completed'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-brand-50 text-brand-600'
              }`}
            >
              <NavIcon
                name={mode === 'completed' ? 'check' : 'billing'}
                className="h-5 w-5"
              />
            </span>
            <div>
              <h2 id="receipt-dialog-title" className="text-lg font-semibold text-ink-900">
                {mode === 'completed' ? 'Sale completed' : `Receipt ${sale.billNumber}`}
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                {sale.billNumber} · {formatINR2(sale.amount)} ·{' '}
                {getPaymentLabel(sale.paymentMethod)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <NavIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="receipt-stage flex justify-center bg-cream-100/70 px-4 py-6">
          <ThermalReceipt sale={sale} settings={settings} widthMm={widthMm} />
        </div>

        <div className="receipt-chrome border-t border-cream-200 bg-cream-50/70 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              Receipt width
            </span>
            <div className="flex rounded-lg border border-cream-300 bg-white p-0.5">
              {RECEIPT_WIDTHS.map((width) => (
                <button
                  key={width.value}
                  type="button"
                  aria-pressed={widthMm === width.value}
                  onClick={() => setWidthMm(width.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    widthMm === width.value
                      ? 'bg-brand-600 text-white'
                      : 'text-ink-500 hover:bg-cream-100'
                  }`}
                >
                  {width.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              Print receipt
            </button>
            <button type="button" className="btn-secondary" onClick={handleDownload}>
              Download PDF
            </button>
            <button type="button" className="btn-secondary" onClick={onNewSale}>
              New sale
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SaleReceiptDialog;
