import mongoose from 'mongoose';

const businessSettingsSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: [true, 'Business name is required.'],
      trim: true,
      maxlength: [150, 'Business name cannot be longer than 150 characters.'],
      default: 'Tirupati Puffed Rice Mill',
    },
    address: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Address cannot be longer than 500 characters.'],
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      maxlength: [20, 'Phone cannot be longer than 20 characters.'],
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot be longer than 254 characters.'],
    },
    gstNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      maxlength: [15, 'GST number must be 15 characters long.'],
    },
    ownerName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'Owner name cannot be longer than 100 characters.'],
    },
    receiptFooter: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Receipt footer cannot be longer than 500 characters.'],
    },
    invoiceFooter: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Invoice footer cannot be longer than 500 characters.'],
    },
    retailMuriRate: {
      type: Number,
      default: 45,
      min: [0, 'Retail muri rate cannot be negative.'],
    },
    wholesaleMuriRate: {
      type: Number,
      default: 42,
      min: [0, 'Wholesale muri rate cannot be negative.'],
    },
    bagWeightKg: {
      type: Number,
      default: 50,
      min: [0.01, 'Bag weight must be greater than 0.'],
    },
    lowStockThresholdKg: {
      type: Number,
      default: 100,
      min: [0, 'Low-stock threshold cannot be negative.'],
    },
  },
  {
    timestamps: true,
  },
);

export const BusinessSettings = mongoose.model('BusinessSettings', businessSettingsSchema);
