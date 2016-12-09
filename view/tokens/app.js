/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/tokens/new.js
 *
 * Posts the token with authorization token.
 * CHanges DOM to show user the received token.
 */

import request from 'superagent';
const u = require('../utils');
const Authorization = u.getCookie('Authorization');

// set up constants
const input = document.loginform.elements;
const errorInfo = document.getElementById('errorInfo');
const successInfo = document.getElementById('successInfo');
const tokenInfo = document.getElementById('tokenInfo');
toggleVisibility(tokenInfo, false);
successInfo.innerHTML = 'Max length 60 characters';

document.loginform.addEventListener('submit', (evt) => {
  const name = input.name.value;
  evt.preventDefault();
  const jsonData = { name };
  post(jsonData, '/v1/token');
});

/**
 * Toggles DOM element visibility in-place, based on boolean input
 * @param {Boolean} visibility If true, set the element to visible.
 * Else hide element
 */
function toggleVisibility(elem, visibility) {
  elem.style.visibility = visibility ? 'visible' : 'hidden';
}

/**
 * Post request with given JSON, to given endpoint
 * Show token if succeeded, else display error.
 * @param {Object} jsonData JSON object payload
 * @param {String} address API endpoint
 */
function post(jsonData, address) {
  request
  .post(address)
  .send(jsonData)
  .set('Authorization', Authorization)
  .end((error, res) => {
    if (error) {
      toggleVisibility(errorInfo, true);
      errorInfo.innerHTML = 'An unexpected error occurred';
      toggleVisibility(successInfo, false);
      toggleVisibility(tokenInfo, false);
    } else {
      toggleVisibility(successInfo, true);
      toggleVisibility(tokenInfo, true);
      successInfo.innerHTML = 'Token generated from ' + res.body.name +
        '. Please save this token, you will not see this token again!';
      tokenInfo.innerHTML = res.body.token;
      toggleVisibility(errorInfo, false);
      // reset value
      input.name.value = '';
    }
  });
}
