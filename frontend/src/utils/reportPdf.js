import {
  describeReportFilters,
  getColumnAlign,
  getExtraTable,
  getReportTotals,
} from './reports';
import { formatQuantity, formatReceiptDate, toDateInputValue } from './format';

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pdfMoney = (value) => `Rs. ${moneyFormatter.format(Number(value) || 0)}`;

const pdfValue = (format, value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  switch (format) {
    case 'money':
      return pdfMoney(value);
    case 'quantity':
      return formatQuantity(value);
    case 'percent':
      return `${Number(value).toFixed(2)}%`;
    case 'date':
      return formatReceiptDate(value);
    case 'dateKey':
      return formatReceiptDate(`${value}T12:00:00`);
    case 'number':
      return String(Number(value));
    default:
      return String(value);
  }
};

const cellText = (column, row) => {
  if (column.format === 'flag') {
    return row[column.key] ? column.trueLabel : column.falseLabel;
  }

  return pdfValue(column.format, row[column.key]);
};

const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const fitText = (doc, value, maxWidth) => {
  const text = cleanText(value);

  if (!text || doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  let result = text;

  while (result.length > 1 && doc.getTextWidth(`${result}...`) > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}...`;
};

export const downloadReportPdf = async (report, definition, settings = {}) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 11;
  const usableWidth = pageWidth - margin * 2;
  let y = margin;

  const drawHeader = () => {
    doc.setTextColor(42, 33, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(String(settings.businessName || 'Tirupati Puffed Rice Mill'), margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 95, 78);
    let infoY = y + 5;

    [
      settings.address,
      settings.phone ? `Phone: ${settings.phone}` : '',
      settings.email ? `Email: ${settings.email}` : '',
      settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : '',
    ]
      .filter(Boolean)
      .forEach((line) => {
        const lines = doc.splitTextToSize(line, 100);
        doc.text(lines, margin, infoY);
        infoY += lines.length * 3.4;
      });

    doc.setTextColor(42, 33, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(definition.title.toUpperCase(), pageWidth - margin, y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 95, 78);
    doc.text(`Generated ${formatReceiptDate(new Date())}`, pageWidth - margin, y + 5, {
      align: 'right',
    });
    doc.text(report.range?.label ?? '', pageWidth - margin, y + 9, { align: 'right' });

    const headerBottom = Math.max(infoY, y + 12) + 1.5;
    doc.setDrawColor(42, 33, 24);
    doc.setLineWidth(0.4);
    doc.line(margin, headerBottom, pageWidth - margin, headerBottom);

    const filterText = cleanText(describeReportFilters(report));
    doc.setFontSize(7);
    doc.setTextColor(110, 95, 78);
    doc.text(fitText(doc, filterText, usableWidth), margin, headerBottom + 4.5);

    return headerBottom + 8;
  };

  const drawSummary = (top) => {
    const fields = (definition.summary ?? []).filter(
      (field) => report.summary?.[field.key] !== undefined,
    );

    if (fields.length === 0) {
      return top;
    }

    const perRow = Math.min(fields.length, 6);
    const gap = 3;
    const boxWidth = (usableWidth - gap * (perRow - 1)) / perRow;
    let cursor = top;

    for (let index = 0; index < fields.length; index += perRow) {
      const rowFields = fields.slice(index, index + perRow);

      rowFields.forEach((field, columnIndex) => {
        const x = margin + columnIndex * (boxWidth + gap);
        doc.setFillColor(250, 248, 243);
        doc.setDrawColor(232, 223, 208);
        doc.setLineWidth(0.15);
        doc.rect(x, cursor, boxWidth, 13, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(154, 138, 117);
        doc.text(fitText(doc, field.label.toUpperCase(), boxWidth - 4), x + 2, cursor + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(42, 33, 24);
        doc.text(
          fitText(doc, pdfValue(field.format, report.summary[field.key]), boxWidth - 4),
          x + 2,
          cursor + 10,
        );
      });

      cursor += 16;
    }

    return cursor + 1;
  };

  const drawTable = (columns, rows, totals, top) => {
    const fontSize = columns.length > 10 ? 6.2 : columns.length > 8 ? 6.6 : 7.2;
    const rowHeight = fontSize > 7 ? 5.2 : 4.8;
    const totalWeight = columns.reduce((sum, column) => sum + (column.width ?? 1), 0);
    const widths = columns.map(
      (column) => ((column.width ?? 1) / totalWeight) * usableWidth,
    );
    const positions = [];
    let cursorX = margin;

    widths.forEach((width) => {
      positions.push(cursorX);
      cursorX += width;
    });

    const drawHead = (headTop) => {
      doc.setFillColor(244, 238, 227);
      doc.rect(margin, headTop - 3.8, usableWidth, rowHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize - 0.4);
      doc.setTextColor(110, 95, 78);

      columns.forEach((column, index) => {
        const align = getColumnAlign(column);
        const x =
          align === 'right'
            ? positions[index] + widths[index] - 1.4
            : positions[index] + 1.4;

        doc.text(fitText(doc, column.label.toUpperCase(), widths[index] - 2.8), x, headTop, {
          align,
        });
      });

      return headTop + rowHeight;
    };

    const drawRow = (row, rowTop, options = {}) => {
      doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(options.bold ? 42 : 74, options.bold ? 33 : 59, options.bold ? 24 : 43);

      columns.forEach((column, index) => {
        const align = getColumnAlign(column);
        const x =
          align === 'right'
            ? positions[index] + widths[index] - 1.4
            : positions[index] + 1.4;
        const value = options.labelFirst && index === 0
          ? options.labelFirst
          : cellText(column, row);

        doc.text(fitText(doc, value, widths[index] - 2.8), x, rowTop, { align });
      });
    };

    let cursor = drawHead(top);

    rows.forEach((row, index) => {
      if (cursor + rowHeight > pageHeight - 16) {
        doc.addPage();
        cursor = drawHead(margin + 3);
      }

      if (index % 2 === 1) {
        doc.setFillColor(252, 250, 246);
        doc.rect(margin, cursor - 3.6, usableWidth, rowHeight, 'F');
      }

      drawRow(row, cursor);
      doc.setDrawColor(240, 234, 224);
      doc.setLineWidth(0.1);
      doc.line(margin, cursor + 1.2, pageWidth - margin, cursor + 1.2);
      cursor += rowHeight;
    });

    if (totals && Object.keys(totals).length > 0) {
      if (cursor + rowHeight > pageHeight - 16) {
        doc.addPage();
        cursor = drawHead(margin + 3);
      }

      doc.setDrawColor(42, 33, 24);
      doc.setLineWidth(0.3);
      doc.line(margin, cursor - 3.4, pageWidth - margin, cursor - 3.4);
      drawRow(totals, cursor, { bold: true, labelFirst: `Total (${rows.length} rows)` });
      cursor += rowHeight;
    }

    return cursor;
  };

  y = drawHeader();
  y = drawSummary(y);
  y = drawTable(
    definition.columns,
    report.rows,
    getReportTotals(definition, report.rows),
    y,
  );

  const extra = getExtraTable(definition, report);

  if (extra) {
    if (y + 12 > pageHeight - 16) {
      doc.addPage();
      y = margin + 3;
    } else {
      y += 4;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(42, 33, 24);
    doc.text(extra.title, margin, y);
    y += 4;
    y = drawTable(extra.columns, extra.rows, extra.totals, y);
  }

  if (report.notes?.length) {
    if (y + 8 > pageHeight - 12) {
      doc.addPage();
      y = margin + 3;
    }

    y += 3;
    doc.setDrawColor(232, 223, 208);
    doc.setLineWidth(0.15);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(154, 138, 117);

    report.notes.forEach((note) => {
      const lines = doc.splitTextToSize(cleanText(note), usableWidth);

      if (y + lines.length * 3 > pageHeight - 8) {
        doc.addPage();
        y = margin + 3;
      }

      doc.text(lines, margin, y);
      y += lines.length * 3 + 1;
    });
  }

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(154, 138, 117);
    doc.text(
      `${definition.title} · ${report.range?.label ?? ''} · Page ${page} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' },
    );
  }

  doc.save(`report-${definition.key}-${toDateInputValue()}.pdf`);
};
