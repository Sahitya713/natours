const AppError = require('../utils/appError');

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // RENDERED WEBSITE
  console.error('ERROR 🎆', err);
  // we just pass down the message here since its in development
  return res
    .status(err.statusCode)
    .render('error', { title: 'Something went wrong!', msg: err.message });
};

// Additional 3 kinds of mongoose operational errors:
// - invalid ID // CastError
// - creating a tour with the same name //MongoError
// - validation error, eg. updating ratings ave to be 6 // ValidationError
const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    // Operational error that we trust: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      // Programming error that we dont want to leak to the client
    }
    // 1) LOG THE ERROR
    console.error('ERROR 🎆', err);

    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
  if (err.isOperational) {
    return res
      .status(err.statusCode)
      .render('error', { title: 'Something went wrong!', msg: err.message });

    // Programming error that we dont want to leak to the client
  }
  // 1) LOG THE ERROR
  console.error('ERROR 🎆', err);

  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  const error = new AppError(message, 400);
  return error;
};

const handleDuplicateFieldsDB = (err) => {
  let field;
  let value;
  Object.keys(err.keyValue).forEach((key) => {
    field = key;
    value = err.keyValue[key];
  });
  const message = `Duplicate field value "${value}" for the field "${field}". Please try another value!`;
  // const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  // const message = `Duplicate field value: ${value}`;
  const error = new AppError(message, 400);
  return error;
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please login again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Token has expired. Please login again!', 401);

module.exports = (err, req, res, next) => {
  // default is internal server error
  // eslint-disable-next-line no-param-reassign
  err.statusCode = err.statusCode || 500;
  // eslint-disable-next-line no-param-reassign
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.create(err);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, req, res);
  }
};
