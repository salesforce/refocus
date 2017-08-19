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
 * Creates a new token for the current user and display the token to the user.
 */
import request from 'superagent';

// set up constants
const PATH = '/v1/tokens';
const SUCCESS_MSG = 'Copy and paste this new token somewhere safe--you will ' +
  'not be able to see it again!';
const input = document.loginform.elements;
const errorInfo = document.getElementById('errorInfo');
const successInfo = document.getElementById('successInfo');
const tokenInfo = document.getElementById('tokenInfo');
const tokenName = document.createElement('p');
const tokenValue = document.createElement('p');
tokenInfo.appendChild(tokenName);
tokenInfo.appendChild(tokenValue);
const formGroup = document.getElementById('formGroup');
successInfo.innerHTML = 'Max length 60 characters';

/**
 * Toggles DOM element visibility in-place based on boolean input.
 *
 * @param {Object} elem - The elememt to show/hide.
 * @param {Boolean} visible - The visibility state to set (true => show,
 *  false => hidden).
 */
function toggleVisibility(elem, visible) {
  // sets className to show or hidden
  elem.className = visible ? 'show' : 'hidden';
}

/**
 * Render error message. If the response has a JSON "text" attribute which
 * contains an array of errors, display the error type and message for the
 * first item in that array, otherwise just display a generic message.
 *
 * @param {Object} res - The response object
 */
function handleError(res) {
  try {
    const e = JSON.parse(res.text).errors.shift();
    errorInfo.innerHTML = `${e.type} for "${e.value}": ${e.message}.`;
  } catch (ex) {
    errorInfo.innerHTML = 'An unexpected error occurred.';
  }

  toggleVisibility(errorInfo, true);
  toggleVisibility(successInfo, false);
  toggleVisibility(tokenInfo, false);
} // handleError

/**
 * Send a POST /v1/tokens request with given payload. Display the token on
 * success or error message on failure.
 *
 * @param {Object} data - The request payload. Expecting JSON with a "name"
 *  attribute.
 */
function post(data) {
  request.post(PATH)
  .send(data)
  .end((err, res) => {
    if (err) {
      handleError(res);
    } else {
      toggleVisibility(successInfo, true);
      successInfo.innerHTML = SUCCESS_MSG;
      toggleVisibility(tokenInfo, true);
      tokenName.innerHTML = 'Token name: ' + res.body.name;
      tokenValue.innerHTML = 'Token value: ' + res.body.token;
      toggleVisibility(errorInfo, false);
      toggleVisibility(formGroup, true); // add margin-top
      input.name.value = ''; // reset value
    }
  });
}

toggleVisibility(tokenInfo, false); // default hidden

document.loginform.addEventListener('submit', (evt) => {
  evt.preventDefault();
  post({ name: input.name.value });
});
