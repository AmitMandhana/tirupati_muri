import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: [true, 'Bill number is required.'],
      unique: true,
      trim: true,
    },
    saleType: {
      type: String,
      enum: ['retail', 'wholesale'],
      default: 'retail',
      required: true,
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
      min: [0, 'Quantity cannot be negative.'],
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
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank', 'credit'],
      required: [true, 'Payment method is required.'],
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: [150, 'Customer name cannot be longer than 150 characters.'],
      default: '',
      required: [
        function requireCustomerForCredit() {
          return this.paymentMethod === 'credit';
        },
        'Customer or party name is required for credit sales.',
      ],
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

saleSchema.index({ saleType: 1, createdAt: -1 });

export const Sale = mongoose.model('Sale', saleSchema);
