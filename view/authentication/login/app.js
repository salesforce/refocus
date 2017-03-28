/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/authentication/login/app.js
 *
 * Authenticates a user
 */
'use strict'; // eslint-disable-line strict

import request from 'superagent';

const input = document.loginform.elements;

/**
 * function to extract query parameters from url
 * @param  {String} qs Query string
 * @returns {Object} Decode query params object
 */
function getQueryParams(qs) {
  const params = {};
  const re = /[?&]?([^=]+)=([^&]*)/g;
  const qString = qs.split('+').join(' ');
  let tokens = re.exec(qString);
  while (tokens) {
    params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    tokens = re.exec(qString);
  }

  return params;
}

/**
 * Send request to authenticate api and get result. Redirect to index page if
 * authentication succeeded, else display error.
 * @param  {Object} jsonData json object with user credentials
 */
function sendData(jsonData) {
  let returnUrl = {};
  request
  .post('/v1/authenticate')
  .send(jsonData)
  .end((error, res) => {
    if (error) {
      let errorText = 'An unexpected error occurred';
      if (error.body && error.body.message === 'Invalid credentials') {
        errorText = 'Invalid credentials';
      }

      document.getElementById('errorInfo').innerHTML = errorText;
    } else {
      returnUrl = getQueryParams(window.location.search.substring(1));
      if (returnUrl.ru) {
        window.location.href = returnUrl.ru;
      } else {
        window.location.href = '/';
      }
    }
  });
}

document.loginform.addEventListener('submit', (evt) => {
  evt.preventDefault();
  const jsonData = {};
  jsonData.username = input.username.value;
  jsonData.password = input.password.value;

  sendData(jsonData);
});

document.getElementById('show-login').addEventListener('click', (evt) => {
  evt.preventDefault();
  document.getElementById('login-form').classList.remove('hide');
});
