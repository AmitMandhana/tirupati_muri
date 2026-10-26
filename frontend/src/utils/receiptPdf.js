import { getPaymentLabel } from './billing';
import { formatQuantity, formatReceiptDate, formatReceiptTime } from './format';

const money = (value) => `Rs.${(Number(value) || 0).toFixed(2)}`;

const wrapText = (text, maxChars) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    if (!current) {
      current = word;
    } else if (current.length + word.length + 1 <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
};

const truncate = (value, maxChars) =>
  value.length > maxChars ? `${value.slice(0, Math.max(maxChars - 3, 1))}...` : value;

const buildLines = (sale, settings, widthMm) => {
  const maxChars = widthMm === 58 ? 30 : 44;
  const availableWidth = widthMm - (widthMm === 58 ? 4 : 5) * 2;
  const lines = [];

  const center = (text, options = {}) => lines.push({ type: 'text', text, ...options });
  const row = (label, value, options = {}) =>
    lines.push({ type: 'row', label, value: String(value), ...options });
  const divider = () => center('-'.repeat(maxChars), { muted: true });
  const wrapped = (text, options = {}) =>
    wrapText(text, maxChars).forEach((line) => center(line, options));

  const businessName = String(settings.businessName || 'Tirupati Puffed Rice Mill').toUpperCase();
  // Courier char width is 0.6em; keep the longest line inside the paper width.
  const fitSize = (text, preferred, minimum = 7) => {
    const widthAtSize = text.length * 0.6 * 0.3528 * preferred;
    if (widthAtSize <= availableWidth) {
      return preferred;
    }
    return Math.max(minimum, (availableWidth / (text.length * 0.6 * 0.3528)) * 0.98);
  };

  const headerSize = fitSize(businessName, 11, 7.5);
  if (headerSize < 9) {
    wrapText(businessName, Math.max(10, Math.floor(availableWidth / (9 * 0.6 * 0.3528)))).forEach(
      (line) => center(line, { bold: true, size: 9 }),
    );
  } else {
    center(businessName, { bold: true, size: headerSize });
  }

  if (settings.address) {
    wrapped(settings.address, { size: 7.5 });
  }

  if (settings.phone) {
    center(`Phone: ${settings.phone}`, { size: 7.5 });
  }

  divider();
  row('Bill No', sale.billNumber, { bold: true });
  row('Date', formatReceiptDate(sale.createdAt));
  row('Time', formatReceiptTime(sale.createdAt));
  divider();
  center(sale.productName, { bold: true });

  const itemLabel = `${formatQuantity(sale.quantity)} ${sale.unit} x ${money(sale.rate)}`;
  row(truncate(itemLabel, maxChars - 9), money(sale.amount));

  divider();
  row('TOTAL', money(sale.amount), { bold: true, size: 10 });
  row('Payment', getPaymentLabel(sale.paymentMethod));

  if (sale.customerName) {
    const customer = truncate(String(sale.customerName), maxChars - 10);
    row('Customer', customer);
  }

  if (sale.notes) {
    wrapped(`Note: ${sale.notes}`, { size: 7 });
  }

  divider();
  center('Thank You', { bold: true });

  if (settings.receiptFooter) {
    wrapped(settings.receiptFooter, { size: 7 });
  }

  return lines;
};

export const downloadReceiptPdf = async (sale, settings = {}, widthMm = 58) => {
  const { jsPDF } = await import('jspdf');
  const margin = widthMm === 58 ? 4 : 5;
  const lineHeight = 4.2;
  const lines = buildLines(sale, settings, widthMm);
  const height = Math.max(70, margin * 2 + lines.length * lineHeight + 4);
  const doc = new jsPDF({ unit: 'mm', format: [widthMm, height] });

  let y = margin + 2;

  lines.forEach((line) => {
    doc.setFont('courier', line.bold ? 'bold' : 'normal');
    doc.setFontSize(line.size ?? 8.2);

    if (line.type === 'row') {
      doc.text(line.label, margin, y);
      doc.text(line.value, widthMm - margin, y, { align: 'right' });
    } else {
      doc.text(line.text, widthMm / 2, y, { align: 'center' });
    }

    y += lineHeight;
  });

  doc.save(`receipt-${sale.billNumber}.pdf`);
};
