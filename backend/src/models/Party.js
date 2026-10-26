import mongoose from 'mongoose';

const partySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Party name is required.'],
      trim: true,
      maxlength: [150, 'Party name cannot be longer than 150 characters.'],
    },
    phone: {
      type: String,
      required: [true, 'Party phone is required.'],
      trim: true,
      maxlength: [20, 'Phone cannot be longer than 20 characters.'],
    },
    address: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Address cannot be longer than 300 characters.'],
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Opening balance cannot be negative.'],
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, 'Credit limit cannot be negative.'],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Notes cannot be longer than 500 characters.'],
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

partySchema.index({ name: 1 });
partySchema.index({ phone: 1 });
partySchema.index({ active: 1, name: 1 });

export const Party = mongoose.model('Party', partySchema);
