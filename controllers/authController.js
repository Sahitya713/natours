const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  // remove password from output
  // eslint-disable-next-line no-param-reassign
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user,
    },
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  // const url = 'http://localhost:3000/me';

  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email or password exists

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) check if user exits && if password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    // 401 unauthorised
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) return token
  createSendToken(user, 200, res);
});

// exports.logout = (req, res) => {
//   res.cookie('jwt', 'loggedout', {
//     expires: new Date(Date.now() + 10 * 1000),
//     httpOnly: true,
//   });
//   res.status(200).json({ status: 'success' });
// };
exports.logout = (req, res) => {
  res.clearCookie('jwt');
  res.status(200).json({ status: 'success' });
  // location.reload();
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access', 401)
    );
  }
  // 2) Verification of token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists', 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (await currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'Password has been chaned recently. Please log in again!',
        401
      )
    );
  }

  // PROCEED RO PROTECTED ROUTE
  res.locals.user = currentUser;
  req.user = currentUser;
  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    // 1) Verification of token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    );

    // 2) Check if user still exists

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next();
    }

    // 3) Check if user changed password after the token was issued
    if (await currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    // THERE IS A LOGGED IN USER
    res.locals.user = currentUser;
    return next();
  }
  next();
});

// roles is an array of any size
// we cannot pass arguments to middleware functions
// so we create a wrapper function that returns a middleware fncn
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError(
        'You do not have permission to perform the following action',
        403
      )
      // 403 forbidden
    );
  }
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on Posted email

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email address.', 404));
  }
  // 2) Generate a random token for the user
  const resetToken = user.createPasswordResetToken();
  // teh above function just updates the database but we will still need to save the changes
  await user.save({ validateBeforeSave: false });

  try {
    // 3) Send it to the user's email

    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  // 2) set new password if token has not expired and there is user
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save(); // dw to turn off validators here cause we infact want to validate teh passwords

  // 3) update changedPassowrdAt property for the user
  // done in userModel
  // 4) log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get user from collection
  const user = await User.findById(req.user.id).select('+password');

  const { currPassword, password, passwordConfirm } = req.body;

  // 2) Check if Posted current password is correct
  if (!(await user.correctPassword(currPassword, user.password))) {
    return next(new AppError('You have entered the wrong password!', 401));
  }

  // 3) If so, update password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();
  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
