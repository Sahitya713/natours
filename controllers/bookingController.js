const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
// const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // the url the user will be routed to after successful payment or cancellation
    success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    // we will use strip webhooks to get the session id to add bookings to our data base on production
    // for now this is not safe and just a work around cause anyone who knows this url structure can create booking without act paying
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId, // custom options field
    line_items: [
      {
        // all these fields are defined by stripe, we cannot change or have custom here
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`], // images have to be live images so we take from the alr deployed website for now
        amount: tour.price * 100, // convert to cents
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3) Create session as response

  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // this is only temporary as anyone can make bookings without payony --> INSECURE
  const { tour, user, price } = req.query;

  if (!tour && !price && !user) return next(); // redirect to home page

  await Booking.create({ tour, user, price });
  return res.redirect(req.originalUrl.split('?')[0]); // regirect to overview page without the query parameters
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
