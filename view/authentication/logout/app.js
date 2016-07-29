/**
 * view/authentication/logout/app.js
 * Logs out user
 */

import request from 'superagent';
const u = require('../../utils');

/**
 * Send request to logout user and redirect to login page
 */
function logoutUser() {
  request
  .get('/v1/logout/')
  .set('Authorization', u.getCookie('Authorization'))
  .end((error /* , res*/) => {
    if (!error) {
      window.location.href = '/login';
    }
  });
}

document.getElementById('logoutLink').addEventListener('click', (evt) => {
  evt.preventDefault();
  logoutUser();
  return false;
});
