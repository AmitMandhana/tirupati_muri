import mongoose from 'mongoose';

export const STAFF_STATUSES = ['active', 'inactive'];

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Staff name is required.'],
      trim: true,
      maxlength: [150, 'Staff name cannot be longer than 150 characters.'],
    },
    phone: {
      type: String,
      required: [true, 'Staff phone is required.'],
      trim: true,
      maxlength: [20, 'Phone cannot be longer than 20 characters.'],
    },
    role: {
      type: String,
      required: [true, 'Staff role is required.'],
      trim: true,
      maxlength: [100, 'Role cannot be longer than 100 characters.'],
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required.'],
    },
    monthlySalary: {
      type: Number,
      required: [true, 'Monthly salary is required.'],
      min: [0, 'Monthly salary cannot be negative.'],
    },
    status: {
      type: String,
      enum: STAFF_STATUSES,
      default: 'active',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Notes cannot be longer than 500 characters.'],
    },
  },
  {
    timestamps: true,
  },
);

staffSchema.index({ name: 1 });
staffSchema.index({ phone: 1 });
staffSchema.index({ status: 1, name: 1 });

export const Staff = mongoose.model('Staff', staffSchema);
