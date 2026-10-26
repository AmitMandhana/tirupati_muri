import mongoose from 'mongoose';

const productStockSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required.'],
      unique: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    openingRecorded: {
      type: Boolean,
      default: false,
    },
    lastTransactionAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const ProductStock = mongoose.model('ProductStock', productStockSchema);
