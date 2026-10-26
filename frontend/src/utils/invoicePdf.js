import { getPaymentLabel } from './billing';
import {
  formatQuantity,
  formatReceiptDate,
  formatReceiptTime,
} from './format';
import { getInvoiceStatusMeta } from './invoice';

const money = (value) => `Rs. ${(Number(value) || 0).toFixed(2)}`;

const truncate = (value, maxChars) =>
  String(value).length > maxChars ? `${String(value).slice(0, Math.max(maxChars - 3, 1))}...` : String(value);

export const downloadInvoicePdf = async (invoice, settings = {}) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageWidth = 210;
  const margin = 16;
  const right = pageWidth - margin;
  let y = margin;

  doc.setTextColor(42, 33, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(String(settings.businessName || 'Tirupati Puffed Rice Mill'), margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 95, 78);
  y += 6;

  [settings.address, settings.phone ? `Phone: ${settings.phone}` : '', settings.email ? `Email: ${settings.email}` : '', settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : '']
    .filter(Boolean)
    .forEach((line) => {
      const lines = doc.splitTextToSize(line, 95);
      doc.text(lines, margin, y);
      y += lines.length * 4;
    });

  doc.setTextColor(42, 33, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('WHOLESALE INVOICE', right, margin, { align: 'right' });

  doc.setFontSize(11);
  doc.text(invoice.invoiceNumber, right, margin + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 95, 78);
  doc.text(formatReceiptDate(invoice.createdAt), right, margin + 13, { align: 'right' });
  doc.text(getInvoiceStatusMeta(invoice.status).label, right, margin + 18, { align: 'right' });

  const headerBottom = Math.max(y, margin + 22) + 4;
  doc.setDrawColor(42, 33, 24);
  doc.setLineWidth(0.5);
  doc.line(margin, headerBottom, right, headerBottom);

  let cursor = headerBottom + 8;
  doc.setTextColor(154, 138, 117);
  doc.setFontSize(8);
  doc.text('BILL TO', margin, cursor);

  cursor += 5;
  doc.setTextColor(42, 33, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(truncate(invoice.partyName, 60), margin, cursor);

  cursor += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 95, 78);
  doc.text(`Phone: ${invoice.partyPhone}`, margin, cursor);

  cursor += 10;
  doc.setFillColor(250, 248, 243);
  doc.setTextColor(110, 95, 78);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.rect(margin, cursor - 4, right - margin, 8, 'F');
  doc.text('PRODUCT', margin + 2, cursor + 1);
  doc.text('QUANTITY', right - 62, cursor + 1, { align: 'right' });
  doc.text('RATE', right - 32, cursor + 1, { align: 'right' });
  doc.text('AMOUNT', right - 2, cursor + 1, { align: 'right' });

  cursor += 9;
  doc.setDrawColor(232, 223, 208);
  doc.setLineWidth(0.2);
  doc.line(margin, cursor - 4.5, right, cursor - 4.5);

  doc.setTextColor(42, 33, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(truncate(invoice.productName, 44), margin + 2, cursor);
  doc.text(
    `${formatQuantity(invoice.quantity)} ${invoice.unit}`,
    right - 62,
    cursor,
    { align: 'right' },
  );
  doc.text(money(invoice.rate), right - 32, cursor, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(money(invoice.amount), right - 2, cursor, { align: 'right' });

  cursor += 5;
  doc.setDrawColor(232, 223, 208);
  doc.line(margin, cursor, right, cursor);

  const totalsX = right - 2;
  const labelX = right - 42;
  cursor += 8;

  const totalRow = (label, value, options = {}) => {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(options.bold ? 10 : 9);
    doc.setTextColor(
      options.bold ? 42 : 74,
      options.bold ? 33 : 59,
      options.bold ? 24 : 43,
    );
    doc.text(label, labelX, cursor, { align: 'right' });
    doc.text(value, totalsX, cursor, { align: 'right' });
    cursor += options.gap ?? 5;
  };

  totalRow('Total', money(invoice.total));
  totalRow('Paid', money(invoice.paid));
  doc.setDrawColor(42, 33, 24);
  doc.setLineWidth(0.3);
  doc.line(labelX - 4, cursor - 2.5, totalsX, cursor - 2.5);
  cursor += 1;
  totalRow('Due', money(invoice.due), { bold: true, gap: 9 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 95, 78);
  doc.text(`Payment method: ${getPaymentLabel(invoice.paymentMethod)}`, margin, cursor);
  cursor += 4.5;

  if (invoice.notes) {
    const lines = doc.splitTextToSize(`Notes: ${invoice.notes}`, right - margin);
    doc.text(lines, margin, cursor);
    cursor += lines.length * 4;
  }

  const footerY = 282;
  doc.setDrawColor(232, 223, 208);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 4, right, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(154, 138, 117);

  const footerLines = ['Thank you for your business.'];
  if (settings.invoiceFooter) {
    footerLines.push(...doc.splitTextToSize(String(settings.invoiceFooter), right - margin));
  }

  footerLines.forEach((line, index) => {
    doc.text(line, pageWidth / 2, footerY + index * 4, { align: 'center' });
  });

  doc.text(
    `${invoice.invoiceNumber} · ${formatReceiptTime(invoice.createdAt)}`,
    pageWidth / 2,
    footerY + footerLines.length * 4 + 3,
    { align: 'center' },
  );

  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
};
