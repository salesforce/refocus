/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/utils.js
 */
const apiErrors = require('../apiErrors');
const ZERO = 0;
const ONE = 1;

/**
 * Given an array, return true if there
 * are duplicates. False otherwise.
 *
 * @param {Array} tagsArr The input array
 * @returns {Boolean} whether input array
 * contains duplicates
 */
function hasDuplicates(tagsArr) {
  const LEN = tagsArr.length - ONE;

  // store lowercase copies
  const copyArr = [];
  let toAdd;
  for (let i = LEN; i >= ZERO; i--) {
    let string = tagsArr[i];

    // if the string begins with -, use the rest of the string for comparison
    toAdd = string[0] === '-' ? string.slice(1).toLowerCase() :
      string.toLowerCase();

    // if duplicate found, return true
    if (copyArr.indexOf(toAdd) > -ONE) {
      return true;
    }

    copyArr.push(toAdd);
  }

  return false;
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
 * @param  {Object} props - The module containing the properties of the
 *  resource type.
 */
function noReadOnlyFieldsInReq(req, props) {
  const requestBody = req.body;
  if (props.readOnlyFields) {
    props.readOnlyFields.forEach((field) => {
      // if request body is an array, check each object in array.
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
  hasDuplicates,
  noReadOnlyFieldsInReq,
};
