const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Booking = require('../models/bookingModel');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert =
      "Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediatly, please come back later.";
  next();
};
exports.getOverview = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();
  res.status(200).render('overview', {
    title: 'All tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    select: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('No tour found with that name', 404));
  }
  res
    .status(200)
    // .set(
    //   'Content-Security-Policy',
    //   'connect-src https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com'
    // )
    .render('tour', {
      title: `${tour.name} Tour`,
      tour,
    });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // get all the booking belonging to the current user
  const bookings = await Booking.find({ user: req.user.id });

  // get the tours from the IDS
  const tourIds = bookings.map((e) => e.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.getLoginForm = (req, res) => {
  res
    .status(200)
    // .set(
    //   'Content-Security-Policy',
    //   "connect-src 'self' https://cdnjs.cloudflare.com"
    // )
    // .set('Content-Security-Policy', "connect-src 'self' http://127.0.0.1:3000/")
    .render('login', {
      title: 'Log in to your account',
    });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};
