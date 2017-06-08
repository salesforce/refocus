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
 * Confirms that the array elements contains name and type attributes
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - if the array does not contain valid attributes
 */
function arrayHasValidParameters(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((typeof arr[i] === 'object') &&
        (arr[i].hasOwnProperty('name')) && (arr[i].hasOwnProperty('type'))) {
        if ((!constants.nameRegex.test(arr[i].name)) ||
          (!correctType(arr[i].type, parameterTypes))) {
          throw new ValidationError({
            message: 'Missing a valid name or parameter type',
          });
        }
      } else {
        throw new ValidationError({
          message: 'Object missing a name or type attribute',
        });
      }
    }
  } else {
    throw new ValidationError({
      message: 'Objects not contained in an array',
    });
  }
} // arrayHasValidParameters

/**
 * Custom validation rule that checks whether the the actions values have names
 * and that the parameters listed at valid parameter types
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - Invalid actions array
 */
function validateActionArray(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('name')) &&
        (arr[i].hasOwnProperty('parameters'))) {
        if (!constants.nameRegex.test(arr[i].name)) {
          throw new ValidationError({
            message: 'Missing a valid name',
          });
        }

        arrayHasValidParameters(arr[i].parameters);
      } else {
        throw new ValidationError({
          message: 'Missing a name or parameter attribute',
        });
      }
    }
  } else {
    throw new ValidationError({
      message: 'Objects not contained in an array',
    });
  }
} // validateActionArray

/**
 * Custom validation rule that checks whether the data values have names
 * and valid data types
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - Invalid data array
 */
function validateDataArray(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('name')) && (arr[i].hasOwnProperty('type'))) {
        if ((!constants.nameRegex.test(arr[i].name)) ||
          (!correctType(arr[i].type, dataTypes))) {
          throw new ValidationError({
            message: 'Missing a valid name or data type',
          });
        }
      } else {
        throw new ValidationError({
          message: 'Object missing a name or type attribute',
        });
      }
    }
  } else {
    throw new ValidationError({
      message: 'Objects not contained in an array',
    });
  }
} // validateDataArray

module.exports = {
  validateActionArray,
  validateDataArray,
}; // exports
