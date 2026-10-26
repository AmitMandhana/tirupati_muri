const CANCELLED_FILTER = { cancelled: { $ne: true } };

export const cancelledFields = {
  cancelled: {
    type: Boolean,
    default: false,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  cancelReason: {
    type: String,
    trim: true,
    maxlength: [300, 'Cancellation reason cannot be longer than 300 characters.'],
    default: '',
  },
};

/**
 * Cancelled documents stay in MongoDB for the audit trail but are excluded from
 * every normal find/count/aggregate. Use .setOptions({ includeCancelled: true })
 * to read them, as the backup and audit services do.
 */
export const cancelledPlugin = (schema) => {
  schema.add(cancelledFields);
  schema.index({ cancelled: 1, cancelledAt: -1 });

  const excludeCancelled = function excludeCancelled() {
    if (this.getOptions?.().includeCancelled) {
      return;
    }

    this.where(CANCELLED_FILTER);
  };

  schema.pre(/^find/, excludeCancelled);
  schema.pre('countDocuments', excludeCancelled);

  schema.pre('aggregate', function excludeCancelledFromAggregate() {
    if (this.options?.includeCancelled) {
      return;
    }

    this.pipeline().unshift({ $match: CANCELLED_FILTER });
  });
};
