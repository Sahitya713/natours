const path = require('path');
const express = require('express');

const app = express();

const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
// 1) GLOBAL middlewares
// SERVING STTAIC FILES
app.use(express.static(path.join(__dirname, 'public')));
// SET HTTP HEADERS
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
    },
  })
);

app.use(cors());
app.options('*', cors());

// DEVELOPMENT LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// LIMIT REQUESTS FROM SAME IP
// allow 100 requests from same IP in 1 hour
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});

app.use('/api', limiter);

// BODY PARSER. Reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
// reading data from form
// app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// DATA SANITISATION AGAINST  NoSQL QUERY INJECTION
app.use(mongoSanitize(0));

// DATA SANITISATION AGAINST XSS (cross side scripting attacks)
// if attacker input some mallicious html code
app.use(xss());

// PREVENT PARAMETER POLLUTION (sorts using the last parameter)
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// TEST MIDDLEWARE
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) Routes

app.use('/api/v1/tours/', tourRouter);
app.use('/api/v1/users/', userRouter);
app.use('/api/v1/reviews/', reviewRouter);
app.use('/api/v1/bookings/', bookingRouter);
app.use('/', viewRouter);

app.all('*', (req, res, next) => {
  // skips all other middleware in the stack and goes straight to error handling middleware
  // any param in next() is assumed to be an error
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(globalErrorHandler);
module.exports = app;
