/**
 * view/authentication/login/app.js
 *
 * Authenticates a user
 */
'use strict'; // eslint-disable-line strict

import request from 'superagent';
const u = require('../../utils');

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
  .post('/v1/authenticate/')
  .send(jsonData)
  .end((error, res) => {
    if (error) {
      document.getElementById('errorInfo').innerHTML =
      'An unexpected error occurred';
    } else {
      u.setCookie('Authorization', res.body.token);
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
  jsonData.email = input.email.value;
  jsonData.password = input.password.value;

  sendData(jsonData);
});
