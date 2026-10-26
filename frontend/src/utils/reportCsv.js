import {
  describeReportFilters,
  formatReportValue,
  getExtraTable,
  getReportTotals,
} from './reports';
import { formatReceiptDate, toDateInputValue } from './format';

const escapeCell = (value) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const cellValue = (column, row) => {
  if (column.format === 'flag') {
    return row[column.key] ? column.trueLabel : column.falseLabel;
  }

  const value = row[column.key];

  switch (column.format) {
    case 'money':
      return (Number(value) || 0).toFixed(2);
    case 'quantity':
      return (Number(value) || 0).toFixed(2);
    case 'percent':
      return value === null || value === undefined || value === ''
        ? ''
        : Number(value).toFixed(2);
    case 'date':
      return value ? formatReceiptDate(value) : '';
    case 'dateKey':
      return value ? formatReceiptDate(`${value}T12:00:00`) : '';
    case 'number':
      return String(Number(value) || 0);
    default:
      return value ?? '';
  }
};

const buildRows = (definition, report) => {
  const lines = [];
  const settings = report.settings ?? {};

  if (settings.businessName) {
    lines.push([settings.businessName]);
  }

  lines.push([definition.title]);
  lines.push([`Period: ${report.range?.label ?? ''}`]);
  lines.push([`Filters: ${describeReportFilters(report)}`]);
  lines.push([`Generated: ${formatReceiptDate(new Date())}`]);
  lines.push([]);

  if (definition.summary?.length) {
    lines.push(['Summary']);
    definition.summary.forEach((field) => {
      if (report.summary?.[field.key] === undefined) {
        return;
      }

      lines.push([
        field.label,
        formatReportValue(field.format ?? 'text', report.summary[field.key]),
      ]);
    });
    lines.push([]);
  }

  lines.push(definition.columns.map((column) => column.label));
  report.rows.forEach((row) => {
    lines.push(definition.columns.map((column) => cellValue(column, row)));
  });

  const totals = getReportTotals(definition, report.rows);

  if ((definition.totals ?? []).length > 0) {
    lines.push([
      `Total (${report.rows.length} rows)`,
      ...definition.columns
        .slice(1)
        .map((column) =>
          totals[column.key] !== undefined ? cellValue(column, totals) : '',
        ),
    ]);
  }

  const extra = getExtraTable(definition, report);

  if (extra) {
    lines.push([]);
    lines.push([extra.title]);
    lines.push(extra.columns.map((column) => column.label));
    extra.rows.forEach((row) => {
      lines.push(extra.columns.map((column) => cellValue(column, row)));
    });

    if ((extra.totals ?? []).length > 0) {
      lines.push([
        `Total (${extra.rows.length} rows)`,
        ...extra.columns
          .slice(1)
          .map((column) =>
            extra.totals[column.key] !== undefined
              ? cellValue(column, extra.totals)
              : '',
          ),
      ]);
    }
  }

  if (report.notes?.length) {
    lines.push([]);
    report.notes.forEach((note) => lines.push([note]));
  }

  return lines;
};

export const buildReportCsv = (report, definition) =>
  buildRows(definition, report)
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');

export const downloadReportCsv = (report, definition, settings = {}) => {
  const csv = buildReportCsv({ ...report, settings }, definition);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `report-${definition.key}-${toDateInputValue()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
