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
const formGroup = document.getElementById('formGroup');
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
  // sets className to show or hidden
  elem.className = visibility ? 'show' : 'hidden';
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
      successInfo.innerHTML = 'Copy and paste your new token ' +
        'somewhere safe--you will not be able to see it again!';

      toggleVisibility(tokenInfo, true);
      const para_name = document.createElement("p");
      const para_value = document.createElement("p");
      const token_name = document.createTextNode("Token name: " + res.body.name);
      const token_value = document.createTextNode("Token value: " + res.body.token);
      para_name.appendChild(token_name);
      para_value.appendChild(token_value);

      tokenInfo.appendChild(para_name);
      tokenInfo.appendChild(para_value);

      toggleVisibility(errorInfo, false);
      // add margin-top
      toggleVisibility(formGroup, true);
      // reset value
      input.name.value = '';
    }
  });
}
