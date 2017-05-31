/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/botUtils.js
 *
 * Used by the Bot model.
 */

const ValidationError = require('../dbErrors').ValidationError;
const constants = require('../constants');
const parameterTypes = ['BOOLEAN', 'INTEGER', 'DECIMAL', 'STRING'];
const dataTypes = ['BOOLEAN', 'INTEGER', 'DECIMAL', 'STRING', 'ARRAY'];

/**
 * Determines if the type in the types list
 *
 * @param {String} str - listed type
 * @param {Array} types - allowed types
 * @returns {Boolean} - True/False
 */
function correctType(str, types) {
  for (let i = 0; i < types.length; i++) {
    if (types[i] === str) {
      return true;
    }
  }

  return false;
}

/**
 * Confirms that the array contains only parameter values
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} if the array does not contain two elements
 */
function arrayHasValidParameters(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((typeof arr[i] === 'object') &&
        (arr[i].hasOwnProperty('name')) && (arr[i].hasOwnProperty('type'))) {
        if ((!constants.nameRegex.test(arr[i].name)) ||
          (!correctType(arr[i].type, parameterTypes))) {
          throw new ValidationError();
        }
      } else {
        throw new ValidationError();
      }
    }
  } else {
    throw new ValidationError();
  }
} // arrayHasValidParameters

/**
 * Custom validation rule that checks wheter the the actions values have names
 * and that the parameters listed at valid parameter types
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError}
 */
function validateActionArray(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('name')) &&
        (arr[i].hasOwnProperty('parameters'))) {
        if (!constants.nameRegex.test(arr[i].name)) {
          throw new ValidationError();
        }

        arrayHasValidParameters(arr[i].parameters);
      } else {
        throw new ValidationError();
      }
    }
  } else {
    throw new ValidationError();
  }
} // validateActionArray

/**
 * Custom validation rule that checks wheter the the data values have names
 * and valid data types
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError}
 */
function validateDataArray(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('name')) && (arr[i].hasOwnProperty('type'))) {
        if ((!constants.nameRegex.test(arr[i].name)) ||
          (!correctType(arr[i].type, dataTypes))) {
          throw new ValidationError();
        }
      } else {
        throw new ValidationError();
      }
    }
  } else {
    throw new ValidationError();
  }
} // validateDataArray

module.exports = {
  validateActionArray,
  validateDataArray,
}; // exports
