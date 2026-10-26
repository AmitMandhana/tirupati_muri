import mongoose from 'mongoose';

import { STOCK_REFERENCE_TYPES, STOCK_TRANSACTION_TYPES } from '../utils/stockTypes.js';

const stockTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required.'],
      index: true,
    },
    type: {
      type: String,
      enum: STOCK_TRANSACTION_TYPES,
      required: [true, 'Transaction type is required.'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      validate: {
        validator: (value) => value !== 0,
        message: 'Quantity cannot be zero.',
      },
    },
    referenceId: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference cannot be longer than 100 characters.'],
      default: '',
    },
    referenceType: {
      type: String,
      enum: STOCK_REFERENCE_TYPES,
      default: 'manual',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot be longer than 500 characters.'],
      default: '',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

stockTransactionSchema.index({ product: 1, date: -1, _id: -1 });

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
