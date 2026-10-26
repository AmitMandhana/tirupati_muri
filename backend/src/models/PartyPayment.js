import mongoose from 'mongoose';

export const PARTY_PAYMENT_METHODS = ['cash', 'upi', 'bank'];
export const PARTY_PAYMENT_ACCOUNTS = ['cash', 'bank'];

const partyPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: [true, 'Payment number is required.'],
      unique: true,
      trim: true,
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: [true, 'Party is required.'],
    },
    partyName: {
      type: String,
      required: [true, 'Party name is required.'],
      trim: true,
      maxlength: [150, 'Party name cannot be longer than 150 characters.'],
    },
    partyPhone: {
      type: String,
      required: [true, 'Party phone is required.'],
      trim: true,
      maxlength: [20, 'Phone cannot be longer than 20 characters.'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required.'],
      min: [0.01, 'Payment amount must be greater than 0.'],
    },
    paymentMethod: {
      type: String,
      enum: PARTY_PAYMENT_METHODS,
      required: [true, 'Payment method is required.'],
    },
    account: {
      type: String,
      enum: PARTY_PAYMENT_ACCOUNTS,
      required: [true, 'Cash or bank account is required.'],
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
      default: null,
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required.'],
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

partyPaymentSchema.index({ party: 1, paymentDate: 1, _id: 1 });
partyPaymentSchema.index({ paymentDate: -1 });

export const PartyPayment = mongoose.model('PartyPayment', partyPaymentSchema);
