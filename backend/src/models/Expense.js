import mongoose from 'mongoose';

export const EXPENSE_PAYMENT_METHODS = ['cash', 'upi', 'bank'];
export const EXPENSE_ACCOUNTS = ['cash', 'bank'];

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: [true, 'Expense number is required.'],
      unique: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: [true, 'Expense category is required.'],
    },
    categoryKey: {
      type: String,
      required: [true, 'Expense category key is required.'],
      trim: true,
      lowercase: true,
    },
    categoryName: {
      type: String,
      required: [true, 'Expense category name is required.'],
      trim: true,
      maxlength: [60, 'Category name cannot be longer than 60 characters.'],
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required.'],
      min: [0.01, 'Expense amount must be greater than 0.'],
    },
    paymentMethod: {
      type: String,
      enum: EXPENSE_PAYMENT_METHODS,
      required: [true, 'Payment method is required.'],
    },
    account: {
      type: String,
      enum: EXPENSE_ACCOUNTS,
      required: [true, 'Cash or bank account is required.'],
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      default: null,
    },
    expenseDate: {
      type: Date,
      required: [true, 'Expense date is required.'],
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
  },
  {
    timestamps: true,
  },
);

expenseSchema.index({ expenseDate: -1, _id: -1 });
expenseSchema.index({ account: 1, expenseDate: 1 });
expenseSchema.index({ categoryKey: 1, expenseDate: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
