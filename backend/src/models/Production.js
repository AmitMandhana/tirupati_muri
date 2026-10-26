import mongoose from 'mongoose';

import { cancelledPlugin } from './plugins/cancelled.js';

const productionSchema = new mongoose.Schema(
  {
    productionNumber: {
      type: String,
      required: [true, 'Production number is required.'],
      unique: true,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required.'],
    },
    productName: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required.'],
      trim: true,
      default: 'KG',
    },
    productionDate: {
      type: Date,
      required: [true, 'Production date is required.'],
    },
    rawMaterialKg: {
      type: Number,
      required: [true, 'Raw material quantity is required.'],
      min: [0.000001, 'Raw material quantity must be greater than 0.'],
    },
    finishedKg: {
      type: Number,
      required: [true, 'Finished muri quantity is required.'],
      min: [0.000001, 'Finished muri quantity must be greater than 0.'],
    },
    wastageKg: {
      type: Number,
      default: 0,
      min: [0, 'Wastage quantity cannot be negative.'],
    },
    productionCost: {
      type: Number,
      default: 0,
      min: [0, 'Production cost cannot be negative.'],
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

productionSchema.index({ productionDate: -1, _id: -1 });
productionSchema.plugin(cancelledPlugin);

export const Production = mongoose.model('Production', productionSchema);
