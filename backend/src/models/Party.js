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
  },
  {
    timestamps: true,
  },
);

partySchema.index({ name: 1 });
partySchema.index({ phone: 1 });

export const Party = mongoose.model('Party', partySchema);
