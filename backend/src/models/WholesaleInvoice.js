import mongoose from 'mongoose';

export const WHOLESALE_PAYMENT_METHODS = ['cash', 'upi', 'bank', 'credit'];
export const WHOLESALE_INVOICE_STATUSES = ['paid', 'partial', 'credit'];

const wholesaleInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required.'],
      unique: true,
      trim: true,
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: [true, 'Party is required.'],
    },
    partyName: {
      type: String,
      required: [true, 'Party name is required.'],
      trim: true,
      maxlength: [150, 'Party name cannot be longer than 150 characters.'],
    },
    partyPhone: {
      type: String,
      required: [true, 'Party phone is required.'],
      trim: true,
      maxlength: [20, 'Phone cannot be longer than 20 characters.'],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required.'],
    },
    productName: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
      maxlength: [100, 'Product name cannot be longer than 100 characters.'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required.'],
      trim: true,
      maxlength: [20, 'Unit cannot be longer than 20 characters.'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [0.000001, 'Quantity must be greater than 0.'],
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required.'],
      min: [0, 'Rate cannot be negative.'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
      min: [0, 'Amount cannot be negative.'],
    },
    total: {
      type: Number,
      required: [true, 'Invoice total is required.'],
      min: [0, 'Invoice total cannot be negative.'],
    },
    paid: {
      type: Number,
      required: [true, 'Amount received is required.'],
      default: 0,
      min: [0, 'Amount received cannot be negative.'],
      validate: {
        validator(value) {
          return value <= this.total;
        },
        message: 'Amount received cannot exceed the invoice total.',
      },
    },
    due: {
      type: Number,
      required: [true, 'Due amount is required.'],
      min: [0, 'Due amount cannot be negative.'],
    },
    paymentMethod: {
      type: String,
      enum: WHOLESALE_PAYMENT_METHODS,
      required: [true, 'Payment method is required.'],
    },
    status: {
      type: String,
      enum: WHOLESALE_INVOICE_STATUSES,
      required: [true, 'Invoice status is required.'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot be longer than 500 characters.'],
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

wholesaleInvoiceSchema.index({ createdAt: -1 });
wholesaleInvoiceSchema.index({ party: 1, createdAt: -1 });
wholesaleInvoiceSchema.index({ status: 1, createdAt: -1 });

export const WholesaleInvoice = mongoose.model('WholesaleInvoice', wholesaleInvoiceSchema);
