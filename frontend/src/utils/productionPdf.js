import { formatQuantity, formatReceiptDate, toDateInputValue } from './format';
import { describeProductionFilters } from './production';

const truncate = (value, maxChars) =>
  String(value).length > maxChars
    ? `${String(value).slice(0, Math.max(maxChars - 3, 1))}...`
    : String(value);

const percent = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : '—';

const rawPerKg = (value) =>
  Number.isFinite(Number(value)) ? `${formatQuantity(value)} KG` : '—';

const computeYield = (finishedKg, rawMaterialKg) =>
  Number(rawMaterialKg) > 0 ? (Number(finishedKg) / Number(rawMaterialKg)) * 100 : null;

export const downloadProductionPdf = async (productions = [], settings = {}, filters = {}) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const right = pageWidth - margin;
  let y = margin;

  const drawHeader = () => {
    doc.setTextColor(42, 33, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(String(settings.businessName || 'Tirupati Puffed Rice Mill'), margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
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
        infoY += lines.length * 3.8;
      });

    doc.setTextColor(42, 33, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PRODUCTION HISTORY', right, y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(110, 95, 78);
    doc.text(`Generated ${formatReceiptDate(new Date())}`, right, y + 5.5, { align: 'right' });
    doc.text(`${productions.length} records`, right, y + 10, { align: 'right' });

    const headerBottom = Math.max(infoY, y + 13) + 2;
    doc.setDrawColor(42, 33, 24);
    doc.setLineWidth(0.4);
    doc.line(margin, headerBottom, right, headerBottom);

    doc.setFontSize(8);
    doc.setTextColor(110, 95, 78);
    doc.text(describeProductionFilters(filters), margin, headerBottom + 5);

    return headerBottom + 9;
  };

  const columns = {
    date: margin + 2,
    number: margin + 29,
    raw: margin + 70,
    finished: margin + 101,
    wastage: margin + 126,
    yield: margin + 149,
    ratio: right - 2,
  };

  const drawTableHead = (top) => {
    doc.setFillColor(250, 248, 243);
    doc.rect(margin, top - 4, right - margin, 7, 'F');
    doc.setTextColor(110, 95, 78);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);

    doc.text('DATE', columns.date, top);
    doc.text('PRODUCTION NO.', columns.number, top);
    doc.text('RAW KG', columns.raw, top, { align: 'right' });
    doc.text('FINISHED KG', columns.finished, top, { align: 'right' });
    doc.text('WASTAGE KG', columns.wastage, top, { align: 'right' });
    doc.text('YIELD', columns.yield, top, { align: 'right' });
    doc.text('RAW / KG', columns.ratio, top, { align: 'right' });

    return top + 6;
  };

  const drawTableRow = (production, top, options = {}) => {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(options.bold ? 42 : 74, options.bold ? 33 : 59, options.bold ? 24 : 43);

    doc.text(options.label ?? formatReceiptDate(production.productionDate), columns.date, top);
    doc.text(truncate(options.number ?? production.productionNumber, 22), columns.number, top);
    doc.text(
      options.raw ??
        `${formatQuantity(production.rawMaterialKg)}`,
      columns.raw,
      top,
      { align: 'right' },
    );
    doc.text(
      options.finished ?? `${formatQuantity(production.finishedKg)}`,
      columns.finished,
      top,
      { align: 'right' },
    );
    doc.text(
      options.wastage ?? `${formatQuantity(production.wastageKg)}`,
      columns.wastage,
      top,
      { align: 'right' },
    );
    doc.text(options.yieldText ?? percent(production.yieldPercent), columns.yield, top, {
      align: 'right',
    });
    doc.text(options.ratioText ?? rawPerKg(production.rawMaterialPerKg), columns.ratio, top, {
      align: 'right',
    });
  };

  y = drawHeader();
  y = drawTableHead(y);

  const totals = productions.reduce(
    (accumulator, production) => ({
      raw: accumulator.raw + (Number(production.rawMaterialKg) || 0),
      finished: accumulator.finished + (Number(production.finishedKg) || 0),
      wastage: accumulator.wastage + (Number(production.wastageKg) || 0),
    }),
    { raw: 0, finished: 0, wastage: 0 },
  );

  productions.forEach((production) => {
    if (y > pageHeight - 24) {
      doc.addPage();
      y = margin;
      y = drawTableHead(y);
    }

    drawTableRow(production, y);
    doc.setDrawColor(232, 223, 208);
    doc.setLineWidth(0.15);
    doc.line(margin, y + 2, right, y + 2);
    y += 6;
  });

  if (y > pageHeight - 24) {
    doc.addPage();
    y = margin;
    y = drawTableHead(y);
  }

  doc.setDrawColor(42, 33, 24);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 1, right, y - 1);
  y += 5;

  const totalYield = computeYield(totals.finished, totals.raw);
  const totalRatio = totals.finished > 0 ? totals.raw / totals.finished : null;

  drawTableRow(null, y, {
    bold: true,
    label: 'TOTAL',
    number: `${productions.length} records`,
    raw: formatQuantity(totals.raw),
    finished: formatQuantity(totals.finished),
    wastage: formatQuantity(totals.wastage),
    yieldText: percent(totalYield),
    ratioText: rawPerKg(totalRatio),
  });

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(154, 138, 117);
    doc.text(
      `Production history · ${formatReceiptDate(new Date())} · Page ${page} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' },
    );
  }

  doc.save(`production-history-${toDateInputValue()}.pdf`);
};
