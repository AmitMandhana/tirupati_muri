import mongoose from 'mongoose';

const expenseCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required.'],
      trim: true,
      maxlength: [60, 'Category name cannot be longer than 60 characters.'],
    },
    nameKey: {
      type: String,
      required: [true, 'Category key is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [60, 'Category key cannot be longer than 60 characters.'],
    },
    sortOrder: {
      type: Number,
      default: 999,
    },
  },
  {
    timestamps: true,
  },
);

export const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
