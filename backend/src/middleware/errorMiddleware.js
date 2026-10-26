export const notFound = (req, res) => {
  res.status(404).json({ message: 'The requested resource was not found.' });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid request data.' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request data is too large.' });
  }

  if (error.name === 'ValidationError') {
    const firstMessage = Object.values(error.errors)[0]?.message;
    return res.status(400).json({ message: firstMessage || 'Please check the submitted details.' });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid value provided.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with these details already exists.' });
  }

  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    message: statusCode >= 500 ? 'Something went wrong. Please try again.' : error.message,
  });
};
