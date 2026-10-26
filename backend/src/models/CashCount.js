import mongoose from 'mongoose';

const cashCountSchema = new mongoose.Schema(
  {
    countDate: {
      type: Date,
      required: [true, 'Count date is required.'],
    },
    expectedCash: {
      type: Number,
      required: [true, 'Expected cash is required.'],
    },
    physicalCash: {
      type: Number,
      required: [true, 'Physical cash is required.'],
      min: [0, 'Physical cash cannot be negative.'],
    },
    difference: {
      type: Number,
      required: [true, 'Cash difference is required.'],
    },
    adjusted: {
      type: Boolean,
      default: false,
    },
    adjustment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashAdjustment',
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [300, 'Reason cannot be longer than 300 characters.'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot be longer than 500 characters.'],
      default: '',
    },
    countedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

cashCountSchema.index({ countDate: -1, countedAt: -1 });

export const CashCount = mongoose.model('CashCount', cashCountSchema);
