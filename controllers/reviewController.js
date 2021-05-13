// const catchAsync = require('../utils/catchAsync');
const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.user) req.body.user = req.user.id;
  if (!req.body.tour) req.body.tour = req.params.tourId;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.deleteTour = factory.deleteOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
