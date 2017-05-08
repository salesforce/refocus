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

/**
 * Given an array, return true if there
 * are duplicates. False otherwise.
 *
 * @param {Array} tagsArr The input array
 * @returns {Boolean} whether input array
 * contains duplicates
 */

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

module.exports = {
  noReadOnlyFieldsInReq,
};
