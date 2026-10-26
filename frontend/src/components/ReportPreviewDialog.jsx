import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

import NavIcon from './NavIcon';
import { downloadReportCsv } from '../utils/reportCsv';
import { downloadReportPdf } from '../utils/reportPdf';
import { formatReceiptDate } from '../utils/format';
import {
  describeReportFilters,
  formatReportCell,
  formatReportValue,
  getColumnAlign,
  getExtraTable,
  getReportSummaryItems,
  getReportTotals,
} from '../utils/reports';

const alignClass = (column) =>
  getColumnAlign(column) === 'right' ? 'text-right' : 'text-left';

const ReportTable = ({ columns, rows, totals, emptyText, label, compact = false }) => (
  <table className={`w-full border-collapse ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
    <thead>
      <tr className="border-b border-cream-300 bg-cream-50 text-[9px] uppercase tracking-[0.06em] text-ink-500">
        {columns.map((column) => (
          <th
            key={column.key}
            scope="col"
            className={`whitespace-nowrap px-1.5 py-1.5 font-semibold ${alignClass(column)}`}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="divide-y divide-cream-200">
      {rows.length === 0 ? (
        <tr>
          <td
            colSpan={columns.length}
            className="px-2 py-6 text-center text-xs text-ink-400"
          >
            {emptyText}
          </td>
        </tr>
      ) : (
        rows.map((row, index) => (
          <tr key={`${label}-${index}`} className="text-ink-700">
            {columns.map((column) => (
              <td
                key={column.key}
                className={`px-1.5 py-1.5 align-top ${
                  getColumnAlign(column) === 'right'
                    ? 'whitespace-nowrap text-right'
                    : 'text-left'
                }`}
              >
                {formatReportCell(column, row)}
              </td>
            ))}
          </tr>
        ))
      )}
    </tbody>
    {rows.length > 0 && totals && Object.keys(totals).length > 0 ? (
      <tfoot>
        <tr className="border-t-2 border-ink-900 text-ink-900">
          <td className="px-1.5 py-1.5 font-semibold">
            Total · {rows.length} rows
          </td>
          {columns.slice(1).map((column) => (
            <td
              key={column.key}
              className={`whitespace-nowrap px-1.5 py-1.5 font-semibold ${alignClass(column)}`}
            >
              {totals[column.key] !== undefined
                ? formatReportValue(column.format, totals[column.key])
                : ''}
            </td>
          ))}
        </tr>
      </tfoot>
    ) : null}
  </table>
);

const ReportPreviewDialog = ({ report, definition, settings = {}, onClose }) => {
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

  const summaryItems = getReportSummaryItems(definition, report);
  const totals = getReportTotals(definition, report.rows);
  const extra = getExtraTable(definition, report);

  const handleDownloadPdf = async () => {
    try {
      await downloadReportPdf(report, definition, settings);
      toast.success('Report PDF downloaded.');
    } catch {
      toast.error('Unable to generate the report PDF.');
    }
  };

  const handleDownloadCsv = () => {
    try {
      downloadReportCsv(report, definition, settings);
      toast.success('Report CSV downloaded.');
    } catch {
      toast.error('Unable to generate the report CSV.');
    }
  };

  return createPortal(
    <div
      className="report-portal fixed inset-0 z-50 overflow-y-auto bg-ink-900/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-preview-title"
    >
      <style>{'@media print { @page { size: A4 landscape; margin: 0; } }'}</style>
      <div className="report-shell mx-auto my-2 w-full max-w-[1180px] overflow-hidden rounded-xl bg-white shadow-2xl sm:my-6">
        <div className="report-chrome flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <NavIcon name="reports" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="report-preview-title" className="text-lg font-semibold text-ink-900">
                {definition.title}
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                {report.range?.label} · {report.rows.length} rows ·{' '}
                {describeReportFilters(report)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report preview"
            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <NavIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="report-stage overflow-x-auto bg-cream-100/70 px-3 py-5 sm:px-5 sm:py-6">
          <div className="report-paper mx-auto w-[297mm] max-w-none bg-white p-10 shadow-sm">
            <div className="flex items-start justify-between gap-6 border-b border-cream-300 pb-4">
              <div>
                <h1 className="text-xl font-semibold text-ink-900">
                  {settings.businessName || 'Tirupati Puffed Rice Mill'}
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
                  {definition.title}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Generated {formatReceiptDate(new Date())}
                </p>
                <p className="text-xs text-ink-500">{report.range?.label}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-ink-500">{describeReportFilters(report)}</p>

            {summaryItems.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {summaryItems.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-lg border border-cream-200 bg-cream-50/70 px-2.5 py-2"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-ink-400">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink-900">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4">
              <ReportTable
                columns={definition.columns}
                rows={report.rows}
                totals={(definition.totals ?? []).length > 0 ? totals : null}
                emptyText={definition.emptyText}
                label={definition.key}
              />
            </div>

            {extra ? (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-700">
                  {extra.title}
                </h3>
                <div className="mt-2">
                  <ReportTable
                    columns={extra.columns}
                    rows={extra.rows}
                    totals={(extra.totals ?? []).length > 0 ? extra.totals : null}
                    emptyText={definition.emptyText}
                    label={`${definition.key}-extra`}
                    compact
                  />
                </div>
              </div>
            ) : null}

            {report.notes?.length ? (
              <div className="mt-6 border-t border-cream-200 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Notes
                </p>
                <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-ink-400">
                  {report.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="report-chrome border-t border-cream-200 bg-cream-50/70 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              Print
            </button>
            <button type="button" className="btn-secondary" onClick={handleDownloadPdf}>
              Download PDF
            </button>
            <button type="button" className="btn-secondary" onClick={handleDownloadCsv}>
              Download CSV
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-ink-400">
            A4 landscape · {definition.title} · {report.range?.label}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ReportPreviewDialog;
