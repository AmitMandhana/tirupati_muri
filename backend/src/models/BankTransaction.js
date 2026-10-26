import mongoose from 'mongoose';

export const BANK_TRANSACTION_TYPES = [
  'deposit',
  'withdrawal',
  'sales-collection',
  'party-payment',
  'expense',
  'loan-receipt',
  'loan-repayment',
  'transfer',
  'other',
];

export const BANK_TRANSACTION_DIRECTIONS = ['inflow', 'outflow'];

export const MANUAL_BANK_TRANSACTION_TYPES = [
  'deposit',
  'withdrawal',
  'sales-collection',
  'party-payment',
  'expense',
  'loan-receipt',
  'loan-repayment',
  'other',
];

const bankTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: [true, 'Transaction number is required.'],
      unique: true,
      trim: true,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: [true, 'Bank account is required.'],
    },
    type: {
      type: String,
      enum: BANK_TRANSACTION_TYPES,
      required: [true, 'Transaction type is required.'],
    },
    direction: {
      type: String,
      enum: BANK_TRANSACTION_DIRECTIONS,
      required: [true, 'Transaction direction is required.'],
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required.'],
      min: [0.01, 'Transaction amount must be greater than 0.'],
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required.'],
    },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      maxlength: [200, 'Description cannot be longer than 200 characters.'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot be longer than 500 characters.'],
      default: '',
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [60, 'Reference cannot be longer than 60 characters.'],
      default: '',
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    transferAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

bankTransactionSchema.index({ bankAccount: 1, transactionDate: -1, createdAt: -1 });
bankTransactionSchema.index({ transactionDate: -1 });
bankTransactionSchema.index({ transferId: 1 });

export const BankTransaction = mongoose.model('BankTransaction', bankTransactionSchema);
