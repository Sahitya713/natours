module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
  // catch(next) is the same as catch(err => next(err))
};

// const catchAsync = (fn) => {
//   return (req, res, next) => {
//     fn(req, res, next).catch(next);
//     // catch(next) is the same as catch(err => next(err))
//   };
// };
