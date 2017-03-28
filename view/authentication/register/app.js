/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/authentication/register/app.js
 *
 * Registers user in Refocus
 */
import request from 'superagent';

const input = document.loginform.elements;

/**
 * Check if password and retype password matches and set setCustomValidity
 * accordingly.
 */
function validatePassword() {
  const password = input.password;
  const confirmPassword = input.repassword;
  if (password.value === confirmPassword.value) {
    confirmPassword.setCustomValidity('');
  } else {
    confirmPassword.setCustomValidity('Passwords Don\'t Match');
  }
}

/**
 * Send request to register api and get result. Redirect to index page if
 * registration succeeded, else display error.
 * @param  {Object} jsonData json object with user credentials
 */
function sendData(jsonData) {
  request
  .post('/v1/register/')
  .send(jsonData)
  .end((error, res) => {
    if (error) {
      let errorText = 'An unexpected error occurred';
      if (error.response.body.errors[0].message ===
       'User already exists') {
        errorText = 'User already exists';
      }

      document.getElementById('errorInfo').innerHTML = errorText;
    } else {
      window.location.href = '/';
    }
  });
}

input.password.onchange = validatePassword;
input.repassword.onkeyup = validatePassword;

document.loginform.addEventListener('submit', (evt) => {
  evt.preventDefault();
  const jsonData = {};
  jsonData.email = input.email.value;
  jsonData.username = input.username.value;
  jsonData.password = input.password.value;


  sendData(jsonData);
});
