/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

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
