/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/common.js
 */
const apiErrors = require('../api/v1/apiErrors');
const constants = require('../api/v1/constants');
const featureToggles = require('feature-toggles');

/**
 * Logs with stack trace if toggle is on and
 *  there are invalid values in hmset object.
 * Otherwise has no effect.
 *
 * @param {String} key The redis key to hmset the object
 * @param {Object} obj The object from hmset
 */
function logInvalidHmsetValues(key, obj) {
  if (featureToggles.isFeatureEnabled('logInvalidHmsetValues')) {
    for (let _key in obj) {
      if ((obj[_key] === undefined) || Array.isArray(obj[_key])) {
        console.trace('Invalid hmset params found when setting: key ' + key +
          ' with undefined field: ' + _key + ', received: ' +
          JSON.stringify(obj));
        break;
      }
    }
  }
}

/**
 * Check if read only field exists in given object
 * @param  {String} field - Field name
 * @param  {Object} obj - Request object
 * @throws {Object} - Throws validation error is field exists
 */
function checkReadOnlyFieldInObj(field, obj) {
  if (obj.hasOwnProperty(field)) {
    throw new apiErrors.ValidationError(
      { explanation: `You cannot modify the read-only field: ${field}` }
    );
  }
}

/**
 * Throws a validation error if the read-only fields are found in the request.
 * @param  {Object} req - The request object
 * @param  {Array} readOnlyFields - Contains fields to exclude
 */
function noReadOnlyFieldsInReq(req, readOnlyFields) {
  const requestBody = req.body || req;
  if (readOnlyFields) {
    readOnlyFields.forEach((field) => {
      // if request body is an array, check each object in the array.
      if (Array.isArray(requestBody)) {
        requestBody.forEach((reqObj) => {
          checkReadOnlyFieldInObj(field, reqObj);
        });
      } else {
        checkReadOnlyFieldInObj(field, requestBody);
      }
    });
  }
} // noReadOnlyFieldsInReq

/**
 * Performs a regex test on the key to determine whether it looks like a
 * postgres uuid. This helps us determine whether to try finding a record by
 * id first then failing over to searching by name, or if the key doesn't meet
 * the criteria to be a postgres uuid, just skip straight to searching by name.
 *
 * @param {String} key - The key to test
 * @returns {Boolean} - True if the key looks like an id
 */
function looksLikeId(key) {
  return constants.POSTGRES_UUID_RE.test(key);
}

module.exports = {
  logInvalidHmsetValues,
  looksLikeId,
  noReadOnlyFieldsInReq,
};
