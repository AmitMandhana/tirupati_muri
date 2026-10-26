import { formatINR2, formatQuantity, formatReceiptDate, formatReceiptTime } from '../utils/format';
import { getPaymentLabel } from '../utils/billing';

const Divider = () => <div className="my-2 border-t border-dashed border-ink-400/70" />;

const ThermalReceipt = ({ sale, settings, widthMm = 58 }) => {
  if (!sale) {
    return null;
  }

  const businessName = (settings?.businessName || 'Tirupati Puffed Rice Mill').toUpperCase();
  const headerClass =
    widthMm === 58
      ? 'text-[11.5px] font-bold tracking-normal'
      : 'text-[13px] font-bold tracking-[0.06em]';

  return (
    <div
      className="receipt-paper bg-white px-3 py-4 font-mono text-[11px] leading-[1.5] text-ink-900"
      style={{ width: `${widthMm}mm` }}
    >
      <div className="text-center">
        <p className={headerClass}>{businessName}</p>
        {settings?.address ? (
          <p className="mt-0.5 whitespace-pre-line text-[10px] text-ink-700">{settings.address}</p>
        ) : null}
        {settings?.phone ? <p className="text-[10px] text-ink-700">Ph: {settings.phone}</p> : null}
      </div>

      <Divider />

      <div className="flex justify-between gap-2">
        <span>Bill No</span>
        <span className="font-bold">{sale.billNumber}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span>Date</span>
        <span>{formatReceiptDate(sale.createdAt)}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span>Time</span>
        <span>{formatReceiptTime(sale.createdAt)}</span>
      </div>

      <Divider />

      <p className="font-bold">{sale.productName}</p>
      <div className="flex justify-between gap-2">
        <span>
          {formatQuantity(sale.quantity)} {sale.unit} × {formatINR2(sale.rate)}
        </span>
        <span>{formatINR2(sale.amount)}</span>
      </div>

      <Divider />

      <div className="flex justify-between gap-2 text-[12px] font-bold">
        <span>TOTAL</span>
        <span>{formatINR2(sale.amount)}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span>Payment</span>
        <span>{getPaymentLabel(sale.paymentMethod)}</span>
      </div>
      {sale.customerName ? (
        <div className="flex justify-between gap-2">
          <span>Customer</span>
          <span className="text-right">{sale.customerName}</span>
        </div>
      ) : null}
      {sale.notes ? <p className="mt-1 text-[10px]">Note: {sale.notes}</p> : null}

      <Divider />

      <p className="text-center text-[12px] font-bold">Thank You</p>
      {settings?.receiptFooter ? (
        <p className="mt-1 whitespace-pre-line text-center text-[10px]">{settings.receiptFooter}</p>
      ) : null}
    </div>
  );
};

export default ThermalReceipt;
