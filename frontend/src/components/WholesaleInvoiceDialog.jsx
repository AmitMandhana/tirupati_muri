import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

import InvoiceSheet from './InvoiceSheet';
import NavIcon from './NavIcon';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { formatINR2 } from '../utils/format';
import { getInvoiceStatusMeta } from '../utils/invoice';
import { buildInvoiceMessage, buildWhatsAppUrl } from '../utils/whatsapp';

const WholesaleInvoiceDialog = ({ invoice, mode = 'completed', onClose, onNewInvoice }) => {
  const { settings } = useBusinessSettings();
  const status = getInvoiceStatusMeta(invoice?.status);

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

  if (!invoice) {
    return null;
  }

  const handleDownload = async () => {
    try {
      await downloadInvoicePdf(invoice, settings);
      toast.success('Invoice PDF downloaded.');
    } catch {
      toast.error('Unable to generate the invoice PDF.');
    }
  };

  const whatsappUrl = buildWhatsAppUrl({
    phone: invoice.partyPhone,
    message: buildInvoiceMessage({
      partyName: invoice.partyName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.createdAt,
      total: invoice.total,
      paid: invoice.paid,
      outstanding: invoice.due,
      businessName: settings.businessName,
    }),
  });

  const handleWhatsApp = () => {
    if (!whatsappUrl) {
      toast.error('Add a phone number for this party to share the invoice.');
      return;
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div
      className="invoice-portal fixed inset-0 z-50 overflow-y-auto bg-ink-900/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-dialog-title"
    >
      <style>{'@media print { @page { size: A4; margin: 0; } }'}</style>
      <div className="invoice-shell mx-auto my-2 w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl sm:my-6">
        <div className="invoice-chrome flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                mode === 'completed'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-brand-50 text-brand-600'
              }`}
            >
              <NavIcon name={mode === 'completed' ? 'check' : 'wholesale'} className="h-5 w-5" />
            </span>
            <div>
              <h2 id="invoice-dialog-title" className="text-lg font-semibold text-ink-900">
                {mode === 'completed'
                  ? `Invoice ${invoice.invoiceNumber} saved`
                  : `Invoice ${invoice.invoiceNumber}`}
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                {invoice.partyName} · {formatINR2(invoice.total)} · {status.label}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice"
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <NavIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="invoice-stage overflow-x-auto bg-cream-100/70 px-3 py-5 sm:px-5 sm:py-6">
          <InvoiceSheet invoice={invoice} />
        </div>

        <div className="invoice-chrome border-t border-cream-200 bg-cream-50/70 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              Print invoice
            </button>
            <button type="button" className="btn-secondary" onClick={handleDownload}>
              Download PDF
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleWhatsApp}
              disabled={!whatsappUrl}
              title={
                whatsappUrl
                  ? `Share invoice ${invoice.invoiceNumber} on WhatsApp`
                  : 'This party has no phone number'
              }
            >
              Share on WhatsApp
            </button>
            {onNewInvoice ? (
              <button type="button" className="btn-secondary" onClick={onNewInvoice}>
                New invoice
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
            )}
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-400">
            A4 invoice · Print, download or send the total, paid and outstanding amount on
            WhatsApp.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default WholesaleInvoiceDialog;
