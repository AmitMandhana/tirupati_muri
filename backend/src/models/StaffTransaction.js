import mongoose from 'mongoose';

import { cancelledPlugin } from './plugins/cancelled.js';

export const STAFF_TRANSACTION_TYPES = [
  'salary',
  'advance',
  'bonus',
  'deduction',
  'recovery',
  'payment',
];

export const STAFF_PAYMENT_TYPES = ['advance', 'payment'];
export const STAFF_PAYMENT_METHODS = ['cash', 'upi', 'bank'];
export const STAFF_PAYMENT_ACCOUNTS = ['cash', 'bank'];

const staffTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: [true, 'Transaction number is required.'],
      unique: true,
      trim: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Staff member is required.'],
    },
    staffName: {
      type: String,
      required: [true, 'Staff name is required.'],
      trim: true,
      maxlength: [150, 'Staff name cannot be longer than 150 characters.'],
    },
    type: {
      type: String,
      enum: STAFF_TRANSACTION_TYPES,
      required: [true, 'Transaction type is required.'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required.'],
      min: [0.01, 'Amount must be greater than 0.'],
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required.'],
    },
    salaryMonth: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      maxlength: [200, 'Description cannot be longer than 200 characters.'],
    },
    paymentMethod: {
      type: String,
      enum: STAFF_PAYMENT_METHODS,
    },
    account: {
      type: String,
      enum: STAFF_PAYMENT_ACCOUNTS,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      default: null,
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

staffTransactionSchema.index({ staff: 1, transactionDate: 1, _id: 1 });
staffTransactionSchema.index({ transactionDate: -1 });
staffTransactionSchema.index(
  { staff: 1, salaryMonth: 1 },
  { unique: true, partialFilterExpression: { type: 'salary' } },
);
staffTransactionSchema.plugin(cancelledPlugin);

export const StaffTransaction = mongoose.model('StaffTransaction', staffTransactionSchema);
