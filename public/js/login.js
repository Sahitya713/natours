/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      // url: 'http://localhost:3000/api/v1/users/login',
      url: '/api/v1/users/login',
      // we can remove the host here and just put ref so it will add the path to current url
      // only cause the api and the website are hosted on the same url/server
      data: {
        email,
        password,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });
    // send invalid cookie without token to browser ==> hence u will be logged out.
    // IMPT set to true to reload from server instead of browser cache
    if (res.data.status === 'success') location.reload();
  } catch (err) {
    console.log(err.response);
    showAlert('error', 'Error logging out! Try again.');
  }
};
