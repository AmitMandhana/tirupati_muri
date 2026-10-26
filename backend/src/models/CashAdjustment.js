import mongoose from 'mongoose';

const cashAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentNumber: {
      type: String,
      required: [true, 'Adjustment number is required.'],
      unique: true,
      trim: true,
    },
    adjustmentDate: {
      type: Date,
      required: [true, 'Adjustment date is required.'],
    },
    amount: {
      type: Number,
      required: [true, 'Adjustment amount is required.'],
      validate: {
        validator(value) {
          return Number.isFinite(value) && Math.abs(value) > 0.004;
        },
        message: 'Adjustment amount cannot be zero.',
      },
    },
    reason: {
      type: String,
      required: [true, 'Adjustment reason is required.'],
      trim: true,
      maxlength: [300, 'Reason cannot be longer than 300 characters.'],
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

cashAdjustmentSchema.index({ adjustmentDate: -1, _id: -1 });

export const CashAdjustment = mongoose.model('CashAdjustment', cashAdjustmentSchema);
