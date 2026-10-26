import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: [true, 'Bank name is required.'],
      trim: true,
      maxlength: [100, 'Bank name cannot be longer than 100 characters.'],
    },
    accountName: {
      type: String,
      required: [true, 'Account name is required.'],
      trim: true,
      maxlength: [150, 'Account name cannot be longer than 150 characters.'],
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required.'],
      unique: true,
      trim: true,
      maxlength: [34, 'Account number cannot be longer than 34 characters.'],
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Opening balance cannot be negative.'],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

bankAccountSchema.index({ active: -1, bankName: 1, accountName: 1 });

export const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
