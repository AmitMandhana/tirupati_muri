import { formatReceiptDate, toDateInputValue } from './format';

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pdfMoney = (value) => `Rs. ${moneyFormatter.format(Number(value) || 0)}`;

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

const COLUMNS = [
  { key: 'date', label: 'Date', width: 15 },
  { key: 'reference', label: 'Reference', width: 17 },
  { key: 'description', label: 'Description', width: 31 },
  { key: 'debit', label: 'Debit', width: 12, align: 'right', money: true },
  { key: 'credit', label: 'Credit', width: 12, align: 'right', money: true },
  { key: 'balance', label: 'Balance', width: 13, align: 'right', money: true },
];

export const downloadLedgerPdf = async ({
  title,
  entityName,
  entityMeta = [],
  periodLabel = '',
  summary = [],
  rows = [],
  settings = {},
  filename,
}) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const right = pageWidth - margin;
  const usableWidth = right - margin;
  let y = margin;

  const drawHeader = () => {
    doc.setTextColor(42, 33, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(String(settings.businessName || 'Tirupati Puffed Rice Mill'), margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 95, 78);
    let infoY = y + 5.5;

    [
      settings.address,
      settings.phone ? `Phone: ${settings.phone}` : '',
      settings.email ? `Email: ${settings.email}` : '',
      settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : '',
    ]
      .filter(Boolean)
      .forEach((line) => {
        const lines = doc.splitTextToSize(line, 95);
        doc.text(lines, margin, infoY);
        infoY += lines.length * 3.6;
      });

    doc.setTextColor(42, 33, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), right, y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 95, 78);
    doc.text(`Generated ${formatReceiptDate(new Date())}`, right, y + 5.5, { align: 'right' });

    if (periodLabel) {
      doc.text(periodLabel, right, y + 10, { align: 'right' });
    }

    const headerBottom = Math.max(infoY, y + 12) + 2;
    doc.setDrawColor(42, 33, 24);
    doc.setLineWidth(0.4);
    doc.line(margin, headerBottom, right, headerBottom);

    doc.setTextColor(42, 33, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(fitText(doc, entityName, usableWidth), margin, headerBottom + 7);

    if (entityMeta.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110, 95, 78);
      doc.text(fitText(doc, entityMeta.filter(Boolean).join(' · '), usableWidth), margin, headerBottom + 12);
    }

    return headerBottom + 18;
  };

  const drawSummary = (top) => {
    if (summary.length === 0) {
      return top;
    }

    const perRow = Math.min(summary.length, 4);
    const gap = 3;
    const boxWidth = (usableWidth - gap * (perRow - 1)) / perRow;
    let cursor = top;

    for (let index = 0; index < summary.length; index += perRow) {
      const items = summary.slice(index, index + perRow);

      items.forEach((item, columnIndex) => {
        const x = margin + columnIndex * (boxWidth + gap);
        doc.setFillColor(250, 248, 243);
        doc.setDrawColor(232, 223, 208);
        doc.setLineWidth(0.15);
        doc.rect(x, cursor, boxWidth, 13, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(154, 138, 117);
        doc.text(fitText(doc, item.label.toUpperCase(), boxWidth - 4), x + 2, cursor + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(42, 33, 24);
        doc.text(
          fitText(doc, pdfMoney(item.value), boxWidth - 4),
          x + 2,
          cursor + 10,
        );
      });

      cursor += 16;
    }

    return cursor + 1;
  };

  const positions = [];
  let cursorX = margin;

  COLUMNS.forEach((column) => {
    positions.push(cursorX);
    cursorX += (column.width / 100) * usableWidth;
  });

  const widths = COLUMNS.map((column) => (column.width / 100) * usableWidth);
  const rowHeight = 5;

  const drawTableHead = (top) => {
    doc.setFillColor(244, 238, 227);
    doc.rect(margin, top - 3.8, usableWidth, rowHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(110, 95, 78);

    COLUMNS.forEach((column, index) => {
      const x = column.align === 'right' ? positions[index] + widths[index] - 1.4 : positions[index] + 1.4;
      doc.text(column.label.toUpperCase(), x, top, { align: column.align ?? 'left' });
    });

    return top + rowHeight;
  };

  const drawRow = (row, top, options = {}) => {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(options.bold ? 42 : 74, options.bold ? 33 : 59, options.bold ? 24 : 43);

    COLUMNS.forEach((column, index) => {
      const x = column.align === 'right' ? positions[index] + widths[index] - 1.4 : positions[index] + 1.4;
      let value;

      if (column.key === 'date') {
        value = row.date ? formatReceiptDate(row.date) : '';
      } else if (column.money) {
        const amount = Number(row[column.key]) || 0;
        value = amount !== 0 ? pdfMoney(amount) : '-';
      } else {
        value = row[column.key];
      }

      doc.text(fitText(doc, value, widths[index] - 2.8), x, top, { align: column.align ?? 'left' });
    });
  };

  y = drawHeader();
  y = drawSummary(y);
  y = drawTableHead(y);

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(154, 138, 117);
    doc.text('No ledger entries for this period.', margin, y + 4);
    y += 10;
  }

  rows.forEach((row, index) => {
    if (y + rowHeight > pageHeight - 16) {
      doc.addPage();
      y = margin + 3;
      y = drawTableHead(y);
    }

    if (index % 2 === 1) {
      doc.setFillColor(252, 250, 246);
      doc.rect(margin, y - 3.6, usableWidth, rowHeight, 'F');
    }

    drawRow(row, y);
    doc.setDrawColor(240, 234, 224);
    doc.setLineWidth(0.1);
    doc.line(margin, y + 1.4, right, y + 1.4);
    y += rowHeight;
  });

  if (rows.length > 0) {
    if (y + rowHeight > pageHeight - 16) {
      doc.addPage();
      y = margin + 3;
      y = drawTableHead(y);
    }

    doc.setDrawColor(42, 33, 24);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 3.4, right, y - 3.4);

    const debit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
    const credit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
    const lastBalance = Number(rows[rows.length - 1]?.balance) || 0;

    drawRow(
      {
        date: '',
        reference: `${rows.length} entries`,
        description: 'Total',
        debit,
        credit,
        balance: lastBalance,
      },
      y,
      { bold: true },
    );
  }

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(154, 138, 117);
    doc.text(
      `${title} · ${entityName} · Page ${page} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' },
    );
  }

  doc.save(filename || `ledger-${toDateInputValue()}.pdf`);
};
