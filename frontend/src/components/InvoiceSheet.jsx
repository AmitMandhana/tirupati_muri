import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { formatINR2, formatQuantity, formatReceiptDate } from '../utils/format';
import { getInvoiceStatusMeta } from '../utils/invoice';
import { getPaymentLabel } from '../utils/billing';

const InvoiceSheet = ({ invoice }) => {
  const { settings } = useBusinessSettings();
  const status = getInvoiceStatusMeta(invoice.status);

  return (
    <article className="invoice-paper mx-auto w-full max-w-[820px] bg-white px-6 py-7 text-ink-900 sm:px-10 sm:py-10">
      <header className="flex flex-col gap-5 border-b-2 border-ink-900 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-[0.06em] text-ink-900 sm:text-2xl">
            {settings.businessName}
          </h1>
          {settings.address ? (
            <p className="mt-2 max-w-xs whitespace-pre-line text-xs leading-relaxed text-ink-500">
              {settings.address}
            </p>
          ) : null}
          <div className="mt-2 space-y-0.5 text-xs text-ink-500">
            {settings.phone ? <p>Phone: {settings.phone}</p> : null}
            {settings.email ? <p>Email: {settings.email}</p> : null}
            {settings.gstNumber ? <p>GSTIN: {settings.gstNumber}</p> : null}
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">
            Wholesale invoice
          </p>
          <p className="mt-1 text-lg font-bold tracking-wide text-ink-900">
            {invoice.invoiceNumber}
          </p>
          <p className="mt-1 text-xs text-ink-500">{formatReceiptDate(invoice.createdAt)}</p>
          <span className={`pill mt-2 ${status.pillClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} aria-hidden="true" />
            {status.label}
          </span>
        </div>
      </header>

      <section className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
          Bill to
        </p>
        <p className="mt-1 text-sm font-semibold text-ink-900">{invoice.partyName}</p>
        <p className="text-xs text-ink-500">Phone: {invoice.partyPhone}</p>
      </section>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-y border-cream-300 bg-cream-50 text-[10px] uppercase tracking-[0.12em] text-ink-500">
            <th scope="col" className="py-2.5 pl-3 font-semibold">
              Product
            </th>
            <th scope="col" className="py-2.5 text-right font-semibold">
              Quantity
            </th>
            <th scope="col" className="py-2.5 text-right font-semibold">
              Rate
            </th>
            <th scope="col" className="py-2.5 pr-3 text-right font-semibold">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-cream-200">
            <td className="py-3 pl-3">
              <p className="font-medium text-ink-900">{invoice.productName}</p>
            </td>
            <td className="py-3 text-right text-ink-700">
              {formatQuantity(invoice.quantity)} {invoice.unit}
            </td>
            <td className="py-3 text-right text-ink-700">
              {formatINR2(invoice.rate)} / {invoice.unit}
            </td>
            <td className="py-3 pr-3 text-right font-semibold text-ink-900">
              {formatINR2(invoice.amount)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-xs text-ink-500">
          <p>
            <span className="font-semibold text-ink-700">Payment method:</span>{' '}
            {getPaymentLabel(invoice.paymentMethod)}
          </p>
          {invoice.notes ? (
            <p className="mt-2 max-w-xs whitespace-pre-line leading-relaxed">{invoice.notes}</p>
          ) : null}
        </div>

        <dl className="w-full space-y-1.5 text-sm sm:max-w-[240px]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-500">Total</dt>
            <dd className="font-medium text-ink-900">{formatINR2(invoice.total)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-500">Paid</dt>
            <dd className="font-medium text-emerald-700">{formatINR2(invoice.paid)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-cream-200 pt-1.5">
            <dt className="font-semibold text-ink-700">Due</dt>
            <dd className="text-base font-bold text-ink-900">{formatINR2(invoice.due)}</dd>
          </div>
        </dl>
      </div>

      <footer className="mt-8 border-t border-cream-200 pt-4 text-center text-[11px] text-ink-400">
        <p>Thank you for your business.</p>
        {settings.invoiceFooter ? (
          <p className="mx-auto mt-1 max-w-lg whitespace-pre-line leading-relaxed">
            {settings.invoiceFooter}
          </p>
        ) : null}
      </footer>
    </article>
  );
};

export default InvoiceSheet;
