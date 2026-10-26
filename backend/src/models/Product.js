import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
      maxlength: [100, 'Product name cannot be longer than 100 characters.'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required.'],
      trim: true,
      default: 'KG',
      maxlength: [20, 'Unit cannot be longer than 20 characters.'],
    },
    retailRate: {
      type: Number,
      required: [true, 'Retail rate is required.'],
      min: [0, 'Retail rate cannot be negative.'],
    },
    wholesaleRate: {
      type: Number,
      required: [true, 'Wholesale rate is required.'],
      min: [0, 'Wholesale rate cannot be negative.'],
    },
    bagWeight: {
      type: Number,
      required: [true, 'Bag weight is required.'],
      min: [0.01, 'Bag weight must be greater than 0.'],
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

export const Product = mongoose.model('Product', productSchema);
