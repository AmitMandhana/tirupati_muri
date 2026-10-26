import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

import NavIcon from './NavIcon';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { formatQuantity, formatReceiptDate } from '../utils/format';
import { describeProductionFilters } from '../utils/production';
import { downloadProductionPdf } from '../utils/productionPdf';

const percent = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : '—';

const ProductionReportDialog = ({ productions = [], filters = {}, onClose }) => {
  const { settings } = useBusinessSettings();

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

  const totals = productions.reduce(
    (accumulator, production) => ({
      raw: accumulator.raw + (Number(production.rawMaterialKg) || 0),
      finished: accumulator.finished + (Number(production.finishedKg) || 0),
      wastage: accumulator.wastage + (Number(production.wastageKg) || 0),
    }),
    { raw: 0, finished: 0, wastage: 0 },
  );
  const totalYield = totals.raw > 0 ? (totals.finished / totals.raw) * 100 : null;
  const totalRatio = totals.finished > 0 ? totals.raw / totals.finished : null;

  const handleDownload = async () => {
    try {
      await downloadProductionPdf(productions, settings, filters);
      toast.success('Production PDF downloaded.');
    } catch {
      toast.error('Unable to generate the production PDF.');
    }
  };

  return createPortal(
    <div
      className="production-portal fixed inset-0 z-50 overflow-y-auto bg-ink-900/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="production-report-title"
    >
      <style>{'@media print { @page { size: A4; margin: 0; } }'}</style>
      <div className="production-shell mx-auto my-2 w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl sm:my-6">
        <div className="production-chrome flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="production" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="production-report-title" className="text-lg font-semibold text-ink-900">
                Production history
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                {productions.length} records · {describeProductionFilters(filters)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <NavIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="production-stage overflow-x-auto bg-cream-100/70 px-3 py-5 sm:px-5 sm:py-6">
          <div className="production-paper mx-auto w-[210mm] max-w-none bg-white p-10 shadow-sm">
            <div className="flex items-start justify-between gap-6 border-b border-cream-300 pb-4">
              <div>
                <h1 className="text-xl font-semibold text-ink-900">
                  {settings.businessName}
                </h1>
                <div className="mt-1 space-y-0.5 text-xs text-ink-500">
                  {settings.address ? <p>{settings.address}</p> : null}
                  {settings.phone ? <p>Phone: {settings.phone}</p> : null}
                  {settings.email ? <p>Email: {settings.email}</p> : null}
                  {settings.gstNumber ? <p>GSTIN: {settings.gstNumber}</p> : null}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-900">
                  Production History
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Generated {formatReceiptDate(new Date())}
                </p>
                <p className="text-xs text-ink-500">{productions.length} records</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-ink-500">{describeProductionFilters(filters)}</p>

            <table className="mt-4 w-full text-left text-xs">
              <thead>
                <tr className="border-b border-cream-300 bg-cream-50 text-[10px] uppercase tracking-[0.08em] text-ink-500">
                  <th scope="col" className="px-2 py-2 font-semibold">Date</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Production no.</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Raw KG</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Finished KG</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Wastage KG</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Yield</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Raw / KG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {productions.map((production) => (
                  <tr key={production._id} className="text-ink-700">
                    <td className="whitespace-nowrap px-2 py-2">
                      {formatReceiptDate(production.productionDate)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-semibold text-ink-900">
                      {production.productionNumber}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      {formatQuantity(production.rawMaterialKg)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      {formatQuantity(production.finishedKg)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      {formatQuantity(production.wastageKg)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-ink-900">
                      {percent(production.yieldPercent)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      {formatQuantity(production.rawMaterialPerKg)} KG
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-900 text-ink-900">
                  <td className="px-2 py-2 font-semibold" colSpan={2}>
                    Total · {productions.length} records
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {formatQuantity(totals.raw)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {formatQuantity(totals.finished)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {formatQuantity(totals.wastage)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold">{percent(totalYield)}</td>
                  <td className="px-2 py-2 text-right font-semibold">
                    {formatQuantity(totalRatio)} KG
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="mt-6 border-t border-cream-200 pt-3 text-[10px] leading-relaxed text-ink-400">
              Yield = finished Muri ÷ raw material × 100. Raw material per KG = raw material ÷
              finished Muri. Finished Muri is added to stock when each production is saved; raw
              material is kept on the production record only.
            </p>
          </div>
        </div>

        <div className="production-chrome border-t border-cream-200 bg-cream-50/70 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              Print history
            </button>
            <button type="button" className="btn-secondary" onClick={handleDownload}>
              Download PDF
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-400">
            A4 report · {describeProductionFilters(filters)}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ProductionReportDialog;
