/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  const stripe = Stripe(
    'pk_test_51IqUJcHgdzSFd56pjFCoj6GV5gUfh99Q46BO3D50XaYgVRJbrfnkRZuaowg56iijZYzsRqyJ0UWwIwQ82IJ1S4y9000RF8wWJD'
  );
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
