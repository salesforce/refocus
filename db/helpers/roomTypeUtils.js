/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/roomTypeUtils.js
 *
 * Used by the RoomType model.
 */

const ValidationError = require('../dbErrors').ValidationError;
const constants = require('../constants');

/**
 * Determines actions parameters contain a name and value
 *
 * @param {String} arr - list of actions
 * @returns {undefined} - OK
 * @throws {validationError} - Missing attribute
 */
function validateActionsParameters(arr) {
  for (let j = 0; j < arr.parameters.length; j++) {
    if ((arr.parameters[j].hasOwnProperty('name') !== true) ||
      (arr.parameters[j].hasOwnProperty('value') !== true)) {
      throw new ValidationError({
        message: 'Missing a name or value attribute',
      });
    }
  }
} // validateActionsParameters

/**
 * Determines if each actions have a name and parameters
 *
 * @param {String} arr - listed type
 * @returns {undefined} - OK
 * @throws {validationError} - Missing attribute
 */
function validateActions(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('name')) &&
        (arr[i].hasOwnProperty('parameters'))) {
        if (!constants.nameRegex.test(arr[i].name)) {
          throw new ValidationError({
            message: 'Missing a valid name',
          });
        }

        validateActionsParameters(arr[i]);
      } else {
        throw new ValidationError({
          message: 'Object missing a name or parameters attribute',
        });
      }
    }
  } else {
    throw new ValidationError({
      message: 'Objects not contained in an array',
    });
  }
} // validateActions

/**
 * Confirms that rule adheres to the JSON Logic Structure
 * described here http://jsonlogic.com/
 *
 * @param {Object} obj - Rule
 * @returns {undefined} - OK
 * @throws {validationError} - Incorrect JSON logic structure
 */
function validateRules(obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    if ((keys[i] ==='and') || (keys[i] === 'or')) {
      for (let j = 0; j < obj[keys[i]].length; i++) {
        validateRules(obj[keys[i]][j]);
      }
    }
    if (Array.isArray(obj[keys[i]]) !== true) {
      throw new ValidationError({
        message: 'Invalid JSON Logic Expression',
      });
    }
  }
} // validateRules

/**
 * Custom validation rule that checks the settings array to have
 * all valid entries. Meaning each element contains key and a value.
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - Invalid settings array
 */
function validateSettingsArray(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('key')) &&
        (arr[i].hasOwnProperty('value'))) {
        if (!constants.nameRegex.test(arr[i].key)) {
          throw new ValidationError({
            message: 'Missing a valid key',
          });
        }
      } else {
        throw new ValidationError({
          message: 'Missing a key or value attribute',
        });
      }
    }
  } else {
    throw new ValidationError({
      message: 'Objects not contained in an array',
    });
  }
} // validateSettings

/**
 * Makesure
 *
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {validationError} - Invalid data array
 */
function validateRulesArray(arr) {
  if (Array.isArray(arr)) {
    for (let i = 0; i < arr.length; i++) {
      if ((arr[i].hasOwnProperty('rule')) &&
        (arr[i].hasOwnProperty('action'))) {
        validateRules(arr[i].rules);
        validateActions(arr[i].actions);
      } else {
        throw new ValidationError({
          message: 'Object missing a rules or actions attribute',
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
  validateSettingsArray,
  validateRulesArray,
}; // exports
